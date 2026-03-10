const db = require('../config/db');

exports.showReceive = (req, res) => {
    db.all(`
        SELECT v.sku, v.size, v.color, v.stock, p.name AS productName
        FROM product_variants v
        JOIN products p
        ON p.id = v.product_id
        ORDER BY p.name, v.color, v.size
    `, [], (err, variants) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }
        db.all(`
            SELECT
                sr.id, sr.grn_ref, sr.sku, sr.qty_received, sr.received_at, 
                u.username AS received_by_name,
                p.name AS productName,
                v.color, v.size
            FROM stock_receipts sr
            LEFT JOIN users u ON u.id = sr.received_by
            LEFT JOIN product_variants v ON v.sku = sr.sku
            LEFT JOIN products p ON p.id = v.product_id
            ORDER BY sr.received_at DESC
            LIMIT 50
        `, [], (logErr, receiptLog) => {
            if (logErr) {
                console.error(logErr);
                receiptLog = [];
            }
            res.render('grn/receive', {
                user: req.session.user,
                currentPage: 'grn',
                variants,
                receiptLog
            });
        });
    });
};

exports.lookupSku = (req, res) => {
    const sku = (req.query.sku || '').trim().toUpperCase();

    if (!sku) {
        return res.json({ found: false });
    }

    db.get(`
        SELECT v.id, v.sku, v.size, v.color, v.stock, p.name AS productName
        FROM product_variants v
        JOIN products p
        ON p.id = v.product_id
        WHERE v.sku = ?
    `, [sku], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ found: false, error: err.message });
        }

        if (!row) {
            return res.json({ found: false });
        }

        res.json({
            found: true,
            sku: row.sku,
            productName: row.productName,
            name: `${row.productName} (${row.color || ''} ${row.size || ''})`.trim(),
            color: row.color,
            size: row.size,
            stock: row.stock
        });
    });
};

exports.receiveStock = (req, res) => {
    const { grn, lines } = req.body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ success: false, message: 'ไม่มีรายการสินค้า' });
    }

    // Validate: qty ต้องเป็น int > 0 ทุก row
    for (const line of lines) {
        if (!line.sku || !Number.isInteger(Number(line.qty)) || Number(line.qty) < 1) {
            return res.status(400).json({ success: false, message: `ข้อมูลไม่ถูกต้อง: ${line.sku}` });
        }
    }

    const staffId = req.session.user?.id || null;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let errorOccurred = null;
        let updatedCount = 0;

        // ทำทีละ line
        const processNext = (index) => {
            if (errorOccurred) return;

            if (index >= lines.length) {
                // ทุก line สำเร็จ => commit 
                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        return res.status(500).json({ success: false, message: commitErr.message });
                    }
                    res.json({ success: true, updated: updatedCount });
                });
                return;
            }

            const { sku, qty } = lines[index];
            const qtyInt = parseInt(qty);

            // UPDATE stock
            db.run(
                `UPDATE product_variants SET stock = stock + ? WHERE sku = ?`,
                [qtyInt, sku.toUpperCase()],
                function (err) {
                    if (err || this.changes === 0) {
                        errorOccurred = err?.message || `ไม่พบ SKU: ${sku}`;
                        db.run('ROLLBACK');
                        return res.status(400).json({ success: false, message: errorOccurred });
                    }

                    // INSERT log
                    db.run(
                        `INSERT INTO stock_receipts (grn_ref, sku, qty_received, received_by)
                         VALUES (?, ?, ?, ?)`,
                        [grn || null, sku.toUpperCase(), qtyInt, staffId],
                        (insertErr) => {
                            db.run(
                                `INSERT INTO stock_movements (type, sku, qty_change, actor_id, note)
                                VALUES ('receive', ?, ?, ?, ?)`,
                                [sku.toUpperCase(), qtyInt, staffId, `GRN: ${grn || '-'}`]
                            );
                            
                            if (insertErr) {
                                console.error('audit log error:', insertErr.message);
                            }

                            updatedCount++;
                            processNext(index + 1);
                        }
                    );
                }
            );
        };

        processNext(0);
    });
};