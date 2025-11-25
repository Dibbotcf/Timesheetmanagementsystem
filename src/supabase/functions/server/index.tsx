import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase Client for Storage
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const BACKUP_BUCKET = "backups";

// Ensure bucket exists
async function ensureBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === BACKUP_BUCKET)) {
      await supabase.storage.createBucket(BACKUP_BUCKET, { public: false });
    }
  } catch (error) {
    console.error("ensureBucket error:", error);
  }
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "X-Client-Info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// OPTIONS handler to prevent 404/405 on preflight
app.options("/*", (c) => {
  return c.text("", 204);
});

// Global Error Handler
app.onError((err, c) => {
  console.error("Global Error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Health check
app.get("/make-server-1933abde/health", (c) => {
  return c.json({ status: "ok" });
});

// --- Backup API ---

// Helper to handle both path styles (with and without function name prefix)
const backupRoutes = new Hono();

// List Backups
backupRoutes.get("/backups", async (c) => {
  try {
    await ensureBucket();
    const { data, error } = await supabase.storage.from(BACKUP_BUCKET).list();
    if (error) {
      console.error("List backups error:", error);
      return c.json({ error: "Failed to list backups" }, 500);
    }
    return c.json(data);
  } catch (err) {
    console.error("Unexpected error in list backups:", err);
    return c.json({ error: "Unexpected error" }, 500);
  }
});

// Create Backup
backupRoutes.post("/backups", async (c) => {
  try {
    const { type = "manual", label } = await c.req.json();
    
    // 1. Fetch all data
    const [
      employees, 
      templates, 
      folders, 
      timesheets, 
      signatures, 
      leaves,
      otRecords,
      reportFolders,
      savedReports,
      leaveFolders,
      savedLeaveReports
    ] = await Promise.all([
      kv.getByPrefix("employees:"),
      kv.getByPrefix("templates:"),
      kv.getByPrefix("folders:"),
      kv.getByPrefix("timesheets:"),
      kv.getByPrefix("signatures:"),
      kv.getByPrefix("leaves:"),
      kv.getByPrefix("ot_records:"),
      kv.getByPrefix("report_folders:"),
      kv.getByPrefix("saved_reports:"),
      kv.getByPrefix("leave_folders:"),
      kv.getByPrefix("saved_leave_reports:")
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      type,
      label,
      data: { 
        employees, 
        templates, 
        folders, 
        timesheets, 
        signatures, 
        leaves,
        otRecords,
        reportFolders,
        savedReports,
        leaveFolders,
        savedLeaveReports
      }
    };

    // 2. Generate Filename
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const filename = `${type}_${dateStr}_${timeStr}.json`;

    // 3. Upload to Storage
    try {
       await ensureBucket();
    } catch (e) {
       console.error("Bucket creation check failed", e);
    }

    const { error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(filename, JSON.stringify(backupData), {
        contentType: 'application/json',
        upsert: true
      });

    if (error) throw error;

    return c.json({ success: true, filename });
  } catch (err) {
    console.error("Backup creation failed:", err);
    return c.json({ error: "Backup failed" }, 500);
  }
});

// Get Backup Content (for Preview)
backupRoutes.get("/backups/data", async (c) => {
  const path = c.req.query("path");
  if (!path) return c.json({ error: "Path required" }, 400);

  console.log(`Downloading backup: ${path}`);
  try {
    const { data, error } = await supabase.storage.from(BACKUP_BUCKET).download(path);
    if (error) {
        console.error("Download error:", error);
        return c.json({ error: "Failed to download backup" }, 500);
    }

    const text = await data.text();
    return c.json(JSON.parse(text));
  } catch (err) {
      console.error("Unexpected download error:", err);
      return c.json({ error: "Unexpected error during download" }, 500);
  }
});

// Delete Backup
backupRoutes.delete("/backups", async (c) => {
  const path = c.req.query("path");
  if (!path) return c.json({ error: "Path required" }, 400);

  try {
    const { error } = await supabase.storage.from(BACKUP_BUCKET).remove([path]);
    if (error) {
        console.error("Delete error:", error);
        return c.json({ error: "Failed to delete backup" }, 500);
    }
    return c.json({ success: true });
  } catch (err) {
      console.error("Unexpected delete error:", err);
      return c.json({ error: "Unexpected error during deletion" }, 500);
  }
});

// Register routes at root AND with prefix to handle path stripping variance
app.route("/", backupRoutes);
app.route("/make-server-1933abde", backupRoutes);

// Restore Handler
const restoreHandler = async (c: any) => {
  try {
    const { data } = await c.req.json();
    if (!data) return c.json({ error: "No data provided" }, 400);

    // Helper to restore a collection
    const restoreCollection = async (prefix: string, items: any[]) => {
      const currentItems = await kv.getByPrefix(prefix);
      if (currentItems.length > 0) {
        const keysToDelete = currentItems.map((item: any) => `${prefix}${item.id}`);
        if (keysToDelete.length > 0) {
           await kv.mdel(keysToDelete);
        }
      }

      if (items.length > 0) {
        const entries: Record<string, any> = {};
        items.forEach((item: any) => {
          entries[`${prefix}${item.id}`] = item;
        });
        await kv.mset(entries);
      }
    };

    await Promise.all([
      restoreCollection("employees:", data.employees || []),
      restoreCollection("templates:", data.templates || []),
      restoreCollection("folders:", data.folders || []),
      restoreCollection("timesheets:", data.timesheets || []),
      restoreCollection("signatures:", data.signatures || []),
      restoreCollection("leaves:", data.leaves || []),
      restoreCollection("ot_records:", data.otRecords || []),
      restoreCollection("report_folders:", data.reportFolders || []),
      restoreCollection("saved_reports:", data.savedReports || []),
      restoreCollection("leave_folders:", data.leaveFolders || []),
      restoreCollection("saved_leave_reports:", data.savedLeaveReports || [])
    ]);

    return c.json({ success: true });
  } catch (err) {
    console.error("Restore failed:", err);
    return c.json({ error: "Restore failed" }, 500);
  }
};

// Register restore routes
app.post("/restore", restoreHandler);
app.post("/make-server-1933abde/restore", restoreHandler);



// --- Generic Data API ---

// Get all items of a type
app.get("/make-server-1933abde/items/:type", async (c) => {
  const type = c.req.param("type");
  try {
    // Optimization for heavy report items: Fetch only metadata
    if (type === 'saved_reports') {
        const { data, error } = await supabase
            .from('kv_store_1933abde')
            .select('id:value->>id, folderId:value->>folderId, name:value->>name, month:value->>month, customPrevDate:value->>customPrevDate, createdAt:value->>createdAt')
            .like('key', 'saved_reports:%');
        
        if (error) throw error;
        return c.json(data || []);
    }

    if (type === 'saved_leave_reports') {
        const { data, error } = await supabase
            .from('kv_store_1933abde')
            .select('id:value->>id, folderId:value->>folderId, name:value->>name, createdAt:value->>createdAt')
            .like('key', 'saved_leave_reports:%');
        
        if (error) throw error;
        return c.json(data || []);
    }

    // kv.getByPrefix returns an array of values for keys starting with prefix
    const items = await kv.getByPrefix(`${type}:`);
    return c.json(items);
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    return c.json({ error: "Failed to fetch items" }, 500);
  }
});

// Get a single item (Full Data)
app.get("/make-server-1933abde/items/:type/:id", async (c) => {
  const type = c.req.param("type");
  const id = c.req.param("id");
  try {
    const item = await kv.get(`${type}:${id}`);
    if (!item) return c.json({ error: "Item not found" }, 404);
    return c.json(item);
  } catch (error) {
     console.error(`Error fetching ${type}/${id}:`, error);
     return c.json({ error: "Failed to fetch item" }, 500);
  }
});

// Create or Update an item
app.post("/make-server-1933abde/items/:type", async (c) => {
  const type = c.req.param("type");
  try {
    const body = await c.req.json();
    const { id } = body;
    
    if (!id) {
      return c.json({ error: "ID is required in the body" }, 400);
    }

    // Key format: "type:id"
    await kv.set(`${type}:${id}`, body);
    return c.json({ success: true, data: body });
  } catch (error) {
    console.error(`Error saving ${type}:`, error);
    return c.json({ error: "Failed to save item" }, 500);
  }
});

// Delete an item
app.delete("/make-server-1933abde/items/:type/:id", async (c) => {
  const type = c.req.param("type");
  const id = c.req.param("id");
  
  try {
    await kv.del(`${type}:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error(`Error deleting ${type}/${id}:`, error);
    return c.json({ error: "Failed to delete item" }, 500);
  }
});

Deno.serve(app.fetch);
