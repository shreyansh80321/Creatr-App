"use client";
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import z from 'zod'
import {zodResolver} from "@hookform/resolvers/zod"
import { api } from '@/convex/_generated/api';
import { useConvexMutation } from '@/hooks/use-convex-query';
import { useRouter } from "next/navigation";
import PostEditorHeader from './post-editor-header';
import PostEditorContent from './post-editor-content';
import PostEditorSettings from './post-editor-settings';
import { toast } from 'sonner';

const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  category: z.string().optional(),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed"),
  featuredImage: z.string().optional(),
  scheduledFor: z.string().optional(),
});



const PostEditor = ({ initialData = null, mode = "create" }) => {
  const router = useRouter();

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalType, setImageModalType] = useState("featured");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [quillRef, setQuillRef] = useState(null)
   const { mutate: createPost, isLoading: isCreateLoading } = useConvexMutation(
     api.posts.create
   );
   const { mutate: updatePost, isLoading: isUpdating } = useConvexMutation(
     api.posts.update
   );
  
  const form=useForm({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      category: initialData?.category || "",
      tags: initialData?.tags || [],
      featuredImage: initialData?.featuredImage || "",
      scheduledFor: initialData?.scheduledFor
        ? new Date(initialData.scheduledFor).toISOString().slice(0, 16)
        : "",
    },
  });
  const { handleSubmit, watch, setValue } = form;
  const watchedValues = watch();
   useEffect(() => {
     if (!watchedValues.title && !watchedValues.content) return;

     const autoSave = setInterval(() => {
       if (watchedValues.title || watchedValues.content) {
         if (mode === "create") handleSave(true);
       }
     }, 30000);

     return () => clearInterval(autoSave);
   }, [watchedValues.title, watchedValues.content]);
  const handleSave = (silent=false) => { 
    handleSubmit((data) => onSubmit(data, "draft", silent))();
  }
  
  const handlePublish = () => { 
    handleSubmit((data) => onSubmit(data, "publish"))();
  };
  
  const handleSchedule = () => {
    if (!watchedValues.scheduledFor) {
      toast.error("Please select a date and time to schedule");
      return;
    }
    handleSubmit((data) => onSubmit(data, "schedule"))();
  };
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <PostEditorHeader
        mode={mode}
        initialData={initialData}
        isPublishing={isCreateLoading || isUpdating}
        onSave={handleSave}
        onPublish={handlePublish}
        onSchedule={handleSchedule}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        onBack={() => router.push("/dashboard")}
      />
      <PostEditorContent
        form={form}
        setQuillRef={setQuillRef}
        onImageUpload={(type) => {
          setImageModalType(type);
          setIsImageModalOpen(true);
        }}
      />
      <PostEditorSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        form={form}
        mode={mode}
      />
    </div>
  );
}

export default PostEditor