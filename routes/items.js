const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const router = express.Router();

module.exports = (db) => {
  router.post('/generate-item-qrs', async (req, res) => {
    try {
      // Base URL (you can change this to your LAN IP for real testing)
      const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

      // Fetch all items from the database
      const [items] = await db.promise().query('SELECT item_id, item_name FROM tbl_items');

      // Define your output folder under /public/images/qrs
      const outDir = path.join(__dirname, '..', 'public', 'images', 'qrs');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      for (const item of items) {
        // Create a unique URL for this item
        const itemUrl = `${BASE_URL}/item/${item.item_id}`;

        // Update the item record with its QR link
        await db.promise().query(
          'UPDATE tbl_items SET qr_code_url=? WHERE item_id=?',
          [itemUrl, item.item_id]
        );

        // Create and save the QR code image to /public/images/qrs/item-#.png
        const filePath = path.join(outDir, `item-${item.item_id}.png`);
        await QRCode.toFile(filePath, itemUrl, { width: 400 });

        console.log(`✅ Generated QR for Item ${item.item_name}: ${itemUrl}`);
      }

      res.send('✅ All QR codes generated successfully! Check /public/images/qrs/');
    } catch (err) {
      console.error('❌ Error generating item QR codes:', err);
      res.status(500).send('Error generating item QR codes.');
    }
  });

  return router;
};
