const db = require('../config/db');

exports.showReceive = (req, res) => {
    res.render('grn/receive', {
        user: req.session.user,
        currentPage: 'grn'
    });
};

/**
 * GET /stock/lookup-sku?sku=SH001BKL
 * ค้นหา variant จาก SKU แล้วคืนข้อมูลให้ frontend แสดง hint + เปลี่ยน dot status
 */
exports.lookupSku = (req, res) => {
    const sku = (req.query.sku || '').trim().toUpperCase();

    if (!sku) {
        return res.json({ found: false });
    }

    db.get(`
        SELECT v.id, v.sku, v.size, v.color, v.stock,
            p.name AS productName
        FROM product_variants v
        JOIN products p ON p.id = v.product_id
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
            // ชื่อรวม variant สำหรับแสดงใน name field
            name: `${row.productName} (${row.color || ''} ${row.size || ''})`.trim(),
            color: row.color,
            size: row.size,
            stock: row.stock
        });
    });
};

/**
 * POST /stock/receive
 * Body: { grn: "GRN-20250308-1430", lines: [{ sku, qty }, ...] }
 *
 * Logic:
 * 1. ตรวจว่า SKU ทุกรายการมีอยู่จริง (ป้องกัน partial commit)
 * 2. UPDATE stock ทีละแถว ใน transaction
 * 3. INSERT stock_receipts เป็น audit log
 */
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

    // ใช้ serialized เพื่อ simulate transaction (sqlite3 ไม่ support async transaction โดยตรง)
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let errorOccurred = null;
        let updatedCount = 0;

        // ทำทีละ line
        const processNext = (index) => {
            if (errorOccurred) return;

            if (index >= lines.length) {
                // ทุก line สำเร็จ → commit
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

                    // INSERT audit log
                    db.run(
                        `INSERT INTO stock_receipts (grn_ref, sku, qty_received, received_by)
                         VALUES (?, ?, ?, ?)`,
                        [grn || null, sku.toUpperCase(), qtyInt, staffId],
                        (insertErr) => {
                            if (insertErr) {
                                // log ไม่ได้ก็ไม่ใช่ fatal — แต่ถ้าอยากเข้มงวดสามารถ rollback ได้
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