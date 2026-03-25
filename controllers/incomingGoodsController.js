const { pool } = require('../config');

// Get incoming goods for facility
const getIncomingGoods = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { facility_id } = req.params;
    const { status } = req.query;

    let query = `
      SELECT 
        ig.*,
        fr.id as requisition_id,
        fr.status as requisition_status,
        iw.item_name,
        iw.item_code,
        iw.category,
        iw.unit,
        u.name as received_by_name
      FROM incoming_goods ig
      LEFT JOIN facility_requisitions fr ON ig.requisition_id = fr.id
      LEFT JOIN inventory_warehouse iw ON ig.item_id = iw.id
      LEFT JOIN users u ON ig.received_by = u.id
      WHERE ig.facility_id = ?
    `;
    const params = [facility_id];

    if (status) {
      query += ` AND ig.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY ig.created_at DESC`;

    const [goods] = await connection.execute(query, params);

    res.status(200).json({
      success: true,
      data: goods,
      total: goods.length
    });
  } catch (error) {
    console.error("Error fetching incoming goods:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching incoming goods",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Mark goods as received
const markAsReceived = async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { id } = req.params;
    const { quantity_received, remarks, received_by } = req.body;

    // Get incoming goods record
    const [goods] = await connection.execute(
      `SELECT * FROM incoming_goods WHERE id = ?`,
      [id]
    );

    if (goods.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Incoming goods record not found"
      });
    }

    const incomingGood = goods[0];
    const qtyReceived = parseFloat(quantity_received) || parseFloat(incomingGood.quantity_dispatched);

    // Update incoming goods status
    let newStatus = 'received';
    if (qtyReceived < parseFloat(incomingGood.quantity_dispatched)) {
      newStatus = 'partial';
    }

    await connection.execute(
      `UPDATE incoming_goods 
       SET quantity_received = ?, status = ?, received_by = ?, received_at = NOW(), remarks = ?, updated_at = NOW()
       WHERE id = ?`,
      [qtyReceived, newStatus, received_by || null, remarks || null, id]
    );

    // Auto-update facility inventory
    const [itemData] = await connection.execute(
      `SELECT * FROM inventory_warehouse WHERE id = ?`,
      [incomingGood.item_id]
    );

    if (itemData.length > 0) {
      const item = itemData[0];
      
      // Check if item exists in facility inventory
      const [existing] = await connection.execute(
        `SELECT id, quantity FROM inventory_facility WHERE item_id = ? AND facility_id = ?`,
        [incomingGood.item_id, incomingGood.facility_id]
      );

      if (existing.length > 0) {
        // Update existing
        await connection.execute(
          `UPDATE inventory_facility 
           SET quantity = quantity + ?, updated_at = NOW()
           WHERE id = ?`,
          [qtyReceived, existing[0].id]
        );
      } else {
        // Insert new
        await connection.execute(
          `INSERT INTO inventory_facility 
           (item_code, item_name, category, description, unit, facility_id, item_id, quantity, reorder_level, item_cost, expiry_date, batch_number, source_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'warehouse', NOW(), NOW())`,
          [
            item.item_code,
            item.item_name,
            item.category,
            item.description,
            item.unit,
            incomingGood.facility_id,
            incomingGood.item_id,
            qtyReceived,
            item.reorder_level || 10,
            item.item_cost || 0,
            item.expiry_date,
            item.batch_number || null
          ]
        );
      }
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: "Goods marked as received and inventory updated",
      data: {
        id,
        quantity_received: qtyReceived,
        status: newStatus
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error marking goods as received:", error);
    res.status(500).json({
      success: false,
      message: "Error marking goods as received",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Create incoming goods record (called when dispatch is created)
const createIncomingGoods = async (requisitionId, facilityId, dispatchId, itemId, quantity) => {
  const connection = await pool.getConnection();
  try {
    // Get item name and code
    const [item] = await connection.execute(
      `SELECT item_name, item_code FROM inventory_warehouse WHERE id = ?`,
      [itemId]
    );

    // Check if record already exists
    const [existing] = await connection.execute(
      `SELECT id FROM incoming_goods 
       WHERE requisition_id = ? AND item_id = ? AND dispatch_id = ?`,
      [requisitionId, itemId, dispatchId]
    );

    if (existing.length === 0) {
      await connection.execute(
        `INSERT INTO incoming_goods 
         (requisition_id, facility_id, dispatch_id, item_id, item_name, quantity_dispatched, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [
          requisitionId,
          facilityId,
          dispatchId,
          itemId,
          item.length > 0 ? item[0].item_name : null,
          quantity
        ]
      );
    }
  } catch (error) {
    console.error("Error creating incoming goods record:", error);
  } finally {
    connection.release();
  }
};

module.exports = {
  getIncomingGoods,
  markAsReceived,
  createIncomingGoods
};

