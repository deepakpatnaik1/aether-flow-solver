import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList, category: string, customPath?: string) => void;
  files: FileList | null;
}

const categories = [
  { value: 'attachments', label: 'Chat Attachments (Ephemeral)', bucket: 'attachments' },
  { value: 'documents', label: 'General Documents', bucket: 'documents' },
  { value: 'boss', label: 'Boss Files', bucket: 'boss' },
  { value: 'persona', label: 'Persona Files', bucket: 'persona' },
  { value: 'processes', label: 'Process Files', bucket: 'processes' },
];

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  files,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('attachments');

  const handleUpload = () => {
    if (files) {
      onUpload(files, selectedCategory);
      onClose();
    }
  };

  const selectedCategoryData = categories.find(c => c.value === selectedCategory);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Choose the appropriate storage bucket for your files
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {files && (
            <div className="p-3 bg-muted rounded">
              <p className="text-sm font-medium">Files to upload:</p>
              <ul className="text-sm text-muted-foreground">
                {Array.from(files).map((file, index) => (
                  <li key={index}>• {file.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-muted rounded text-sm">
            <p className="font-medium">
              {selectedCategory === 'persona' 
                ? 'Persona files will be processed into database entries'
                : 'Files will be stored in:'
              }
            </p>
            {selectedCategory !== 'persona' && (
              <code className="text-xs">
                {selectedCategoryData?.bucket}/
                {files ? Array.from(files)[0]?.name : 'filename.ext'}
              </code>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!files}>
              Upload Files
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};