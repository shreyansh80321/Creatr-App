"use client";
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const ImageUploadModal = ({
  isOpen,
  onClose,
  onImageSelect,
  title = "Upload & Transform Image"
}) => {
  const [activeTab, setActiveTab] = useState();
  const [uploadedImage, setUploadedImage] = useState(null);
  const handleClose = () => {
    onClose();
    resetForm()
  }
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-6xl !h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription>
            Upload an image and apply AI-powered transformations.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="transform" disbaled={!uploadedImage}>
              Transform
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-4">
            upload
          </TabsContent>
          <TabsContent value="transform" className="space-y-4">
            transform
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadModal