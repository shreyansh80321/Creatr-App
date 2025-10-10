"use client";
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { Check, ImageIcon, Loader2, Upload, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToImageKit } from '@/lib/imagekit';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import Image from 'next/image';
const transformationSchema = z.object({
  aspectRatio: z.string().default("original"),
  customWidth: z.number().min(100).max(2000).default(800),
  customHeight: z.number().min(100).max(2000).default(600),
  smartCropFocus: z.string().default("auto"),
  textOverlay: z.string().optional(),
  textFontSize: z.number().min(12).max(200).default(50),
  textColor: z.string().default("#ffffff"),
  textPosition: z.string().default("center"),
  backgroundRemoved: z.boolean().default(false),
  dropShadow: z.boolean().default(false),
});

const ASPECT_RATIOS = [
  { label: "Original", value: "original" },
  { label: "Square (1:1)", value: "1:1", width: 400, height: 400 },
  { label: "Landscape (16:9)", value: "16:9", width: 800, height: 450 },
  { label: "Portrait (4:5)", value: "4:5", width: 400, height: 500 },
  { label: "Story (9:16)", value: "9:16", width: 450, height: 800 },
  { label: "Custom", value: "custom" },
];

const SMART_CROP_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "Face", value: "face" },
  { label: "Center", value: "center" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

const TEXT_POSITIONS = [
  { label: "Center", value: "center" },
  { label: "Top Left", value: "north_west" },
  { label: "Top Right", value: "north_east" },
  { label: "Bottom Left", value: "south_west" },
  { label: "Bottom Right", value: "south_east" },
  { label: "top", value: "north" },
  { label: "bottom", value: "south" },
  { label: "left", value: "west" },
  { label: "right", value: "east" },
];


const ImageUploadModal = ({
  isOpen,
  onClose,
  onImageSelect,
  title = "Upload & Transform Image"
}) => {
  const [activeTab, setActiveTab] = useState();
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transformedImage, setTransformedImage] = useState(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const {watch,setValue,reset}= useForm({
    resolver: zodResolver(transformationSchema),
    defaultValues: {
      aspectRatio: "original",
      customWidth: 800,
      customHeight: 600,
      smartCropFocus: "auto",
      textOverlay: "",
      textFontSize: 50,
      textColor: "#ffffff",
      textPosition: "center",
      backgroundRemoved: false,
      dropShadow: false,
    },
  })

  const watchedValues = watch();
   const resetForm = () => {
     setUploadedImage(null);
     setTransformedImage(null);
     setActiveTab("upload");
     reset();
   };
  const handleClose = () => {
    onClose();
    resetForm();
  }
  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    console.log(file);
     if (!file.type.startsWith("image/")) {
       toast.error("Please select an image file");
       return;
     }

     // Validate file size (10MB max)
     if (file.size > 10 * 1024 * 1024) {
       toast.error("File size must be less than 10MB");
       return;
    }
    setIsUploading(true);

    try {
       const fileName = `post-image-${Date.now()}-${file.name}`;
      const result = await uploadToImageKit(file, fileName);
       if (result.success) {
         setUploadedImage(result.data);
         setTransformedImage(result.data.url);
         setActiveTab("transform");
         toast.success("Image uploaded successfully!");
       } else {
         toast.error(result.error || "Upload failed");
       }
    } catch(error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
       setIsUploading(false);
    }
  };
  const {getRootProps,getInputProps,isDragActive}=useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
    },
    multiple:false,
  });
  const handleSelectImage = () => {
    if (transformedImage) {
      onImageSelect({
        url: transformedImage,
        originalUrl: uploadedImage?.url,
        fileId: uploadedImage?.fileId,
        name: uploadedImage?.name,
        width: uploadedImage?.width,
        height: uploadedImage?.height,
      });
      onClose();
      resetForm();
    }
  };
  //Apply Transformations
  const applyTransformations = async () => {
    if (!uploadedImage) return;
    setIsTransforming(true);
    try {
      let transformationChain = [];

      //Aspect ratio and resizing
      if (watchedValues.aspectRatio !== "original") {
        const ratio = ASPECT_RATIOS.find(
          (r) => r.value === watchedValues.aspectRatio
        );
        if (ratio && ratio.width && ratio.height) {
          transformationChain.push({
            width: ratio.width,
            height: ratio.height,
            focus: watchedValues.smartCropFocus,
          });
        } else if (watchedValues.aspectRatio === "custom") {
          transformationChain.push({
            width: watchedValues.customWidth,
            height: watchedValues.customHeight,
            focus: watchedValues.smartCropFocus,
          });
        }
      }

      //BAckground removal
      if (watchedValues.backgroundRemoved) {
        transformationChain.push({ effect: "removedotbg" });
      }

      // Drop shadow (only works with transparent background)
      if (watchedValues.dropShadow && watchedValues.backgroundRemoved) {
        transformationChain.push({ effect: "dropshadow" });
      }

      if (watchedValues.textOverlay?.trim()) {
        transformationChain.push({
          overlayText: watchedValues.textOverlay,
          overlayTextFontSize: watchedValues.textFontSize,
          overlayTextColor: watchedValues.textColor.replace("#", ""),
          gravity: watchedValues.textPosition,
          overlayTextPadding: 10,
        });
      }

      // Apply transformations
      const transformedUrl = buildTransformationUrl(
        uploadedImage.url,
        transformationChain
      );

      // Add a small delay to show loading state and allow ImageKit to process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setTransformedImage(transformedUrl);
      toast.success("Transformations applied!");
    } catch (error) {
      console.error("Transformation error:", error);
      toast.error("Failed to apply transformations");
    } finally {
        setIsTransforming(false);
    }
  }

    //reset Transformations
  const resetTransformations = async () => {
    
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="transform" disbaled={!uploadedImage}>
              Transform
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-purple-400 bg-purple-400/10"
                  : "border-slate-600 hover:border-slate-500"
              }`}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-purple-400" />
                  <p className="text-slate-300">Uploading image...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-slate-400" />
                  <div>
                    <p className="text-lg text-white">
                      {isDragActive
                        ? "Drop the image here"
                        : "Drag & drop an image here"}
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      or click to select a file (JPG, PNG, WebP, GIF - Max 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
            {uploadedImage && (
              <div className="text-center space-y-4">
                <Badge
                  variant="secondary"
                  className="bg-green-500/20 text-green-300 border-green-500/30"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Image uploaded successfully!
                </Badge>
                <div className="text-sm text-slate-400">
                  {uploadedImage?.width}x{uploadedImage?.height} .{" "}
                  {Math.round(uploadedImage?.size / 1024)}KB
                </div>
                <Button
                  onClick={() => setActiveTab("transform")}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue700"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Start transforming
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="transform" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                <div className='space-y-4'>
                  <h3 className='text-lg font-semibold text-white flex items-center'>
                  <Wand2 className='h-5 w-5 mr-2'/>
                    AI Transformations
                  </h3>
                  {/* Background Removal */}

                  {/* Drop Shadow */}

                  {/* Aspect Ratio & Cropping */}

                  {/* Text Overlay */}

                  {/* Action Buttons */}
                  <div className='flex gap-3'>
                    <Button onClick={applyTransformations} disbaled={isTransforming} variant={'primary'}>
                      {isTransforming ? (
                       <Loader2 className='h-4 w-4 mr-2 animate-spin'/> 
                      ) : (
                          <Wand2 className='h-4 w-4 mr-2'/>
                    )}
                    </Button>

                  </div>

                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Preview
                </h3>
                {transformedImage && (
                  <div className="relative">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <img
                        src={transformedImage}
                        alt="Transformed preview"
                        className="w-full h-auto max-h-96 object-contain rounded-lg mx-auto"
                        onError={() => {
                          toast.error("Failed to load transformed image");
                          setTransformedImage(uploadedImage?.url);
                        }}
                      />
                    </div>
                    {isTransforming && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <div className="bg-slate-800 rounded-lg p-4 flex items-center space-x-3">
                          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                          <span className="text-white">
                            Applying transformations...
                          </span>
                        </div>
                      </div>
                    )}
                    {uploadedImage && transformedImage && (
                      <div className="text-center space-y-4">
                        <div className="text-sm text-slate-400">
                          Current image URL ready for use
                        </div>

                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={handleSelectImage}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Use This Image
                          </Button>

                          <Button
                            onClick={handleClose}
                            variant="outline"
                            className="border-slate-600 hover:bg-slate-700"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadModal