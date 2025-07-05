import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ReportEditorProps {
  report: {
    id: number;
    videoId: number;
    title: string;
    content: string;
  };
  children: React.ReactNode;
}

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

type FormValues = z.infer<typeof schema>;

const ReportEditor = ({ report, children }: ReportEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: report.title, content: report.content },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      await apiRequest("PUT", `/api/reports/${report.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Report updated" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${report.videoId}/reports`] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update report", description: err.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset({ title: report.title, content: report.content }); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Title" {...register("title")}/>
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            <Textarea rows={10} {...register("content")}/>
            {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportEditor;
