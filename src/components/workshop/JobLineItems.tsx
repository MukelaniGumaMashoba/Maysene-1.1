"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Camera,
  FileText,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  LINE_ITEM_SECTIONS,
} from "@/lib/line-item-templates";

interface LineItem {
  id: number;
  job_id: number;
  description: string;
  category: string;
  section: string;
  status: string;
  notes: string;
  photos: string[];
  completed_by: string | null;
  completed_at: string | null;
}

interface Props {
  jobId: number;
  isMechanic?: boolean;
  onUpdate?: () => void;
}

export default function JobLineItems({ jobId, isMechanic = false, onUpdate }: Props) {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newSection, setNewSection] = useState("Additional");
  const supabase = createClient() as any;

  // Completion modal state
  const [completionModal, setCompletionModal] = useState<{
    open: boolean;
    itemId: number;
    itemDescription: string;
    status: string;
  }>({ open: false, itemId: 0, itemDescription: "", status: "" });
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionPhotos, setCompletionPhotos] = useState<File[]>([]);
  const [completionPhotoUrls, setCompletionPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Existing notes dialog
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesValue, setNotesValue] = useState("");

  useEffect(() => {
    fetchLineItems();
  }, [jobId]);

  const fetchLineItems = async () => {
    const { data, error } = await supabase
      .from("job_line_items")
      .select("*")
      .eq("job_id", jobId)
      .order("section");

    if (!error && data) setLineItems(data);
    setLoading(false);
  };

  const completedCount = lineItems.filter(
    (item) => item.status === "OK" || item.status === "Faulty"
  ).length;
  const progress =
    lineItems.length > 0 ? (completedCount / lineItems.length) * 100 : 0;

  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const filePath = `line-items/${jobId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("job-attachments")
        .upload(filePath, file);
      if (!error) {
        const { data } = supabase.storage
          .from("job-attachments")
          .getPublicUrl(filePath);
        if (data?.publicUrl) urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const openCompletionModal = (itemId: number, description: string, status: string) => {
    setCompletionModal({ open: true, itemId, itemDescription: description, status });
    setCompletionNotes("");
    setCompletionPhotos([]);
    setCompletionPhotoUrls([]);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCompletionPhotos((prev) => [...prev, ...files]);
    // Generate preview URLs
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setCompletionPhotoUrls((prev) => [...prev, url]);
    });
  };

  const removePhoto = (index: number) => {
    setCompletionPhotos((prev) => prev.filter((_, i) => i !== index));
    setCompletionPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const submitCompletion = async () => {
    if (completionModal.status === "Faulty" && !completionNotes.trim()) {
      toast.error("Notes are mandatory when marking as Faulty");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photos
      const photoUrls = completionPhotos.length > 0
        ? await uploadPhotos(completionPhotos)
        : [];

      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Update line item
      const { error } = await supabase
        .from("job_line_items")
        .update({
          status: completionModal.status,
          notes: completionNotes || null,
          photos: photoUrls,
          completed_by: userId,
          completed_at: new Date().toISOString(),
        })
        .eq("id", completionModal.itemId);

      if (error) throw error;

      setLineItems((prev) =>
        prev.map((item) =>
          item.id === completionModal.itemId
            ? {
                ...item,
                status: completionModal.status,
                notes: completionNotes || item.notes,
                photos: photoUrls,
                completed_by: userId,
                completed_at: new Date().toISOString(),
              }
            : item
        )
      );

      toast.success(`Line item marked as ${completionModal.status}`);
      setCompletionModal({ open: false, itemId: 0, itemDescription: "", status: "" });
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to update line item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateNotes = async (itemId: number) => {
    const { error } = await supabase
      .from("job_line_items")
      .update({ notes: notesValue })
      .eq("id", itemId);

    if (!error) {
      setLineItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, notes: notesValue } : item
        )
      );
      setEditingNotes(null);
      toast.success("Notes updated");
    }
  };

  const addLineItem = async () => {
    if (!newItem.trim()) return;
    setAdding(true);

    const { data, error } = await supabase
      .from("job_line_items")
      .insert({
        job_id: jobId,
        description: newItem,
        category: "custom",
        section: newSection,
        status: "Pending",
      })
      .select()
      .single();

    if (!error && data) {
      setLineItems([...lineItems, data]);
      setNewItem("");
      toast.success("Line item added");
    }
    setAdding(false);
  };

  const removeLineItem = async (itemId: number) => {
    const { error } = await supabase
      .from("job_line_items")
      .delete()
      .eq("id", itemId);

    if (!error) {
      setLineItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success("Line item removed");
    }
  };

  const groupedItems = LINE_ITEM_SECTIONS.reduce((acc, section) => {
    const items = lineItems.filter((item) => item.section === section);
    if (items.length > 0) acc[section] = items;
    return acc;
  }, {} as Record<string, LineItem[]>);

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">Loading line items...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Line Items</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {completedCount} of {lineItems.length} completed
          </span>
          <Progress value={progress} className="w-24 h-2" />
        </div>
      </div>

      {Object.entries(groupedItems).map(([section, items]) => (
        <div key={section} className="border rounded-lg p-4">
          <h4 className="font-medium text-sm text-gray-700 mb-3">{section}</h4>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex gap-1">
                  {isMechanic && item.status === "Pending" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-green-600 hover:bg-green-50"
                        onClick={() =>
                          openCompletionModal(item.id, item.description, "OK")
                        }
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        OK
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-red-600 hover:bg-red-50"
                        onClick={() =>
                          openCompletionModal(item.id, item.description, "Faulty")
                        }
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Faulty
                      </Button>
                    </>
                  ) : (
                    <Badge
                      className={
                        item.status === "OK"
                          ? "bg-green-100 text-green-800"
                          : item.status === "Faulty"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {item.status}
                    </Badge>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium">{item.description}</p>
                  {item.notes && (
                    <p className="text-xs text-gray-500 mt-1">
                      Notes: {item.notes}
                    </p>
                  )}
                  {item.photos && item.photos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {item.photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="h-12 w-12 object-cover rounded border"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>

                {isMechanic && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        setEditingNotes(item.id);
                        setNotesValue(item.notes || "");
                      }}
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-500"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add Custom Line Item */}
      {isMechanic && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-sm text-gray-700 mb-3">
            Add Custom Line Item
          </h4>
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Enter line item description..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addLineItem()}
            />
            <Select value={newSection} onValueChange={setNewSection}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINE_ITEM_SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addLineItem} disabled={adding || !newItem.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Completion Modal — Notes + Photos */}
      <Dialog
        open={completionModal.open}
        onOpenChange={(open) => {
          if (!open)
            setCompletionModal({
              open: false,
              itemId: 0,
              itemDescription: "",
              status: "",
            });
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Mark as{" "}
              <span
                className={
                  completionModal.status === "OK"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {completionModal.status}
              </span>
            </DialogTitle>
            <DialogDescription>{completionModal.itemDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>
                Notes{" "}
                {completionModal.status === "Faulty" ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-gray-400">(optional)</span>
                )}
              </Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={
                  completionModal.status === "Faulty"
                    ? "Describe the fault (mandatory)..."
                    : "Add any notes..."
                }
                rows={3}
              />
            </div>

            <div>
              <Label>Photos (optional)</Label>
              <div className="mt-2">
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Click to upload photos
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              </div>

              {completionPhotoUrls.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {completionPhotoUrls.map((url, i) => (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        alt={`Upload ${i + 1}`}
                        className="h-20 w-20 object-cover rounded border"
                      />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCompletionModal({
                  open: false,
                  itemId: 0,
                  itemDescription: "",
                  status: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={submitCompletion}
              disabled={
                isSubmitting ||
                (completionModal.status === "Faulty" && !completionNotes.trim())
              }
              className={
                completionModal.status === "OK"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isSubmitting ? "Saving..." : `Mark as ${completionModal.status}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing Notes Dialog */}
      {editingNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="font-semibold mb-4">Add Notes</h3>
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Add notes for this line item..."
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditingNotes(null)}>
                Cancel
              </Button>
              <Button onClick={() => updateNotes(editingNotes)}>
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
