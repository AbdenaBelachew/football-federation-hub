import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { logAudit } from "../middleware/audit.js";
import { pgDb } from "../db/postgres.js";
import { ROLES } from "../types.js";

export const documentsRouter = Router();

export function mapDocumentRow(d: any): any {
  if (!d) return null;
  return {
    id: d.id,
    fileName: d.file_name,
    fileType: d.file_type,
    fileSize: d.file_size ? Number(d.file_size) : 0,
    documentType: d.document_type,
    ownerType: d.owner_type,
    ownerId: d.owner_id,
    url: d.url,
    status: d.status,
    verifiedBy: d.verified_by,
    verifiedAt: d.verified_at ? new Date(d.verified_at).getTime() : undefined,
    expiryDate: d.expiry_date ? new Date(d.expiry_date).toISOString().split("T")[0] : undefined,
    uploadedBy: d.uploaded_by,
    createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
  };
}

// GET /api/documents
documentsRouter.get("/", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerType, ownerId, documentType, status } = req.query;
    const whereClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (ownerType) {
      whereClauses.push(`owner_type = $${idx++}`);
      params.push(ownerType);
    }
    if (ownerId) {
      whereClauses.push(`owner_id = $${idx++}`);
      params.push(ownerId);
    }
    if (documentType) {
      whereClauses.push(`document_type = $${idx++}`);
      params.push(documentType);
    }
    if (status) {
      whereClauses.push(`status = $${idx++}::document_status`);
      params.push(status);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const result = await pgDb.query(`SELECT * FROM documents ${where} ORDER BY created_at DESC`, params);
    const documents = result.rows.map(mapDocumentRow);

    res.json({ total: documents.length, count: documents.length, items: documents, documents });
  } catch (err: any) {
    console.error("Documents GET error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// GET /api/documents/:id
documentsRouter.get("/:id", authenticate(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pgDb.query("SELECT * FROM documents WHERE id = $1", [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json({ document: mapDocumentRow(result.rows[0]) });
  } catch (err: any) {
    console.error("Document GET by id error:", err);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// POST /api/documents
documentsRouter.post("/", authenticate(false), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fileName,
      fileType = "application/pdf",
      fileSize = 1024,
      documentType,
      ownerType,
      ownerId,
      url,
      expiryDate,
    } = req.body;

    if (!fileName || !documentType || !ownerType || !ownerId) {
      res.status(400).json({ error: "fileName, documentType, ownerType, and ownerId are required" });
      return;
    }

    const id = req.body.id || `doc-${Date.now()}`;
    const fileUrl = url || `https://storage.federation.et/documents/${Date.now()}-${fileName}`;

    const insertRes = await pgDb.query(
      `INSERT INTO documents (
        id, file_name, file_type, file_size, document_type, owner_type,
        owner_id, url, status, expiry_date, uploaded_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'pending'::document_status, $9, $10, NOW()
      ) RETURNING *`,
      [
        id,
        fileName,
        fileType,
        Number(fileSize),
        documentType,
        ownerType,
        ownerId,
        fileUrl,
        expiryDate || null,
        req.user?.id || "anonymous",
      ]
    );

    const doc = mapDocumentRow(insertRes.rows[0]);

    logAudit(req, {
      action: "document.upload",
      entityType: "document",
      entityId: doc.id,
      after: doc,
    });

    res.status(201).json({ message: "Document record registered", document: doc });
  } catch (err: any) {
    console.error("Document create error:", err);
    res.status(500).json({ error: err.message || "Failed to register document" });
  }
});

// PUT /api/documents/:id/verify
documentsRouter.put(
  "/:id/verify",
  authenticate(false),
  requireRole([ROLES.SUPER_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.REGISTRATION_OFFICER]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existingRes = await pgDb.query("SELECT * FROM documents WHERE id = $1", [id]);
      if (!existingRes.rows[0]) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      const existing = mapDocumentRow(existingRes.rows[0]);

      const { status = "verified" } = req.body;

      const updateRes = await pgDb.query(
        `UPDATE documents SET status = $1::document_status, verified_by = $2, verified_at = NOW() WHERE id = $3 RETURNING *`,
        [status, req.user?.id || null, id]
      );
      const updated = mapDocumentRow(updateRes.rows[0]);

      logAudit(req, {
        action: "document.verify",
        entityType: "document",
        entityId: id,
        before: existing,
        after: updated,
      });

      res.json({ message: `Document marked as ${status}`, document: updated });
    } catch (err: any) {
      console.error("Document verify error:", err);
      res.status(500).json({ error: err.message || "Failed to verify document" });
    }
  }
);
