import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ExternalLink, CheckCircle, Clock, Video } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { db } from "@/lib/database-config";
import { supabase } from "@/integrations/supabase/client";

interface VersionManagementProps {
  projectId: string;
  versions: any[];
  onVersionsUpdate: () => void;
  userRole: string | null;
}

export const VersionManagement = ({ projectId, versions, onVersionsUpdate, userRole }: VersionManagementProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<any>(null);
  const [formData, setFormData] = useState({
    preview_url: "",
    final_url: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URLs
    if (formData.preview_url && !isValidUrl(formData.preview_url)) {
      toast.error("Please enter a valid preview URL");
      return;
    }
    if (formData.final_url && !isValidUrl(formData.final_url)) {
      toast.error("Please enter a valid final URL");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingVersion) {
        // Update existing version
        await db.query({
          collection: 'video_versions',
          operation: 'update',
          where: { id: editingVersion.id },
          data: {
            preview_url: formData.preview_url || null,
            final_url: formData.final_url || null,
            updated_at: new Date().toISOString()
          }
        });
        toast.success("Version updated successfully");
      } else {
        // Create new version
        const nextVersionNumber = versions.length > 0 
          ? Math.max(...versions.map(v => v.version_number)) + 1 
          : 1;

        await db.query({
          collection: 'video_versions',
          operation: 'insert',
          data: {
            project_id: projectId,
            version_number: nextVersionNumber,
            preview_url: formData.preview_url || null,
            final_url: formData.final_url || null,
            uploaded_by: user.id,
            is_approved: false
          }
        });
        toast.success("New version created successfully");
      }

      setDialogOpen(false);
      setEditingVersion(null);
      setFormData({ preview_url: "", final_url: "" });
      onVersionsUpdate();
    } catch (error) {
      console.error("Error saving version:", error);
      toast.error("Failed to save version");
    }
  };

  const handleEdit = (version: any) => {
    setEditingVersion(version);
    setFormData({
      preview_url: version.preview_url || "",
      final_url: version.final_url || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (versionId: string) => {
    try {
      await db.query({
        collection: 'video_versions',
        operation: 'delete',
        where: { id: versionId }
      });
      toast.success("Version deleted successfully");
      onVersionsUpdate();
    } catch (error) {
      console.error("Error deleting version:", error);
      toast.error("Failed to delete version");
    }
  };

  const handleApprove = async (versionId: string) => {
    try {
      await db.query({
        collection: 'video_versions',
        operation: 'update',
        where: { id: versionId },
        data: { is_approved: true }
      });
      toast.success("Version approved successfully");
      onVersionsUpdate();
    } catch (error) {
      console.error("Error approving version:", error);
      toast.error("Failed to approve version");
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingVersion(null);
      setFormData({ preview_url: "", final_url: "" });
    }
  };

  return (
    <Card className="shadow-elegant mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Version Management</CardTitle>
            <CardDescription>Track all video versions and their approval status</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVersion ? "Edit Version" : "Add New Version"}</DialogTitle>
                <DialogDescription>
                  {editingVersion ? "Update version details" : "Upload a new video version for review"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preview_url">Preview URL (YouTube/Drive)</Label>
                  <Input
                    id="preview_url"
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.preview_url}
                    onChange={(e) => setFormData({ ...formData, preview_url: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="final_url">Final URL (Drive)</Label>
                  <Input
                    id="final_url"
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={formData.final_url}
                    onChange={(e) => setFormData({ ...formData, final_url: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full gradient-primary">
                  {editingVersion ? "Update Version" : "Add Version"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No versions yet. Add your first version to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Preview Link</TableHead>
                <TableHead>Final Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell className="font-medium">v{version.version_number}</TableCell>
                  <TableCell>{new Date(version.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {version.preview_url ? (
                      <a
                        href={version.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not uploaded</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {version.final_url ? (
                      <a
                        href={version.final_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Download <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not uploaded</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {version.is_approved ? (
                      <Badge className="bg-success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!version.is_approved && userRole === 'client' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(version.id)}
                          className="text-success hover:text-success"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(version)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete version {version.version_number}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(version.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
