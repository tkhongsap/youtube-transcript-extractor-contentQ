import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

const ExportModal = ({ open, onClose }: ExportModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">Export functionality coming soon.</p>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;
