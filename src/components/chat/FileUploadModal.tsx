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
  { 
    value: 'attachments', 
    label: 'Chat Attachments', 
    bucket: 'attachments',
    description: 'Files shared in conversations'
  },
  { 
    value: 'documents', 
    label: 'General Documents', 
    bucket: 'documents',
    description: 'PDFs, text files, spreadsheets'
  },
  { 
    value: 'boss', 
    label: 'Boss Files', 
    bucket: 'boss',
    description: 'Files for the Boss persona'
  },
  { 
    value: 'persona', 
    label: 'Persona Files', 
    bucket: 'persona',
    description: 'Files for AI personas'
  },
  { 
    value: 'processes', 
    label: 'Process Files', 
    bucket: 'processes',
    description: 'Workflow and process documents'
  },
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

          <div className="space-y-3">
            <Label className="text-base font-medium">Storage Location</Label>
            <div className="grid gap-3">
              {categories.map((category) => (
                <div
                  key={category.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCategory === category.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedCategory(category.value)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{category.label}</h4>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                        {category.bucket}/
                      </code>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                      selectedCategory === category.value
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedCategoryData && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded text-sm">
              <p className="font-medium text-primary">Selected: {selectedCategoryData.label}</p>
              <p className="text-muted-foreground">
                Files will be uploaded to the <code className="bg-background px-1 rounded">{selectedCategoryData.bucket}</code> bucket
              </p>
            </div>
          )}

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