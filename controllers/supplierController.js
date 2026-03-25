const { pool } = require('../config');

// Get all suppliers
const getAllSuppliers = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [suppliers] = await connection.execute(
      `SELECT * FROM suppliers ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      data: suppliers,
      total: suppliers.length
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching suppliers",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Get supplier by ID
const getSupplierById = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const [suppliers] = await connection.execute(
      `SELECT * FROM suppliers WHERE id = ?`,
      [id]
    );

    if (suppliers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    res.status(200).json({
      success: true,
      data: suppliers[0]
    });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching supplier",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Create supplier
const createSupplier = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      state,
      country,
      zip_code,
      tax_id,
      payment_terms,
      status,
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required"
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO suppliers 
       (name, contact_person, email, phone, address, city, state, country, zip_code, tax_id, payment_terms, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        contact_person || null,
        email || null,
        phone || null,
        address || null,
        city || null,
        state || null,
        country || null,
        zip_code || null,
        tax_id || null,
        payment_terms || null,
        status || 'active',
        notes || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: {
        id: result.insertId,
        name
      }
    });
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({
      success: false,
      message: "Error creating supplier",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      state,
      country,
      zip_code,
      tax_id,
      payment_terms,
      status,
      notes
    } = req.body;

    // Check if supplier exists
    const [existing] = await connection.execute(
      `SELECT id FROM suppliers WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    await connection.execute(
      `UPDATE suppliers SET
       name = ?, contact_person = ?, email = ?, phone = ?, address = ?,
       city = ?, state = ?, country = ?, zip_code = ?, tax_id = ?,
       payment_terms = ?, status = ?, notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name,
        contact_person || null,
        email || null,
        phone || null,
        address || null,
        city || null,
        state || null,
        country || null,
        zip_code || null,
        tax_id || null,
        payment_terms || null,
        status || 'active',
        notes || null,
        id
      ]
    );

    res.status(200).json({
      success: true,
      message: "Supplier updated successfully"
    });
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({
      success: false,
      message: "Error updating supplier",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    // Check if supplier exists
    const [existing] = await connection.execute(
      `SELECT id FROM suppliers WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    // Check if supplier is used in inventory
    const [inventoryCheck] = await connection.execute(
      `SELECT COUNT(*) as count FROM inventory_warehouse WHERE supplier_id = ?
       UNION ALL
       SELECT COUNT(*) as count FROM inventory_facility WHERE supplier_id = ?`,
      [id, id]
    );

    if (inventoryCheck.length > 0 && inventoryCheck[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete supplier. It is being used in inventory records."
      });
    }

    await connection.execute(
      `DELETE FROM suppliers WHERE id = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Supplier deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting supplier",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};

