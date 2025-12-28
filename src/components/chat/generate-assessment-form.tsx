'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { generateGcrAssessment } from '@/lib/gcr';
import type { Chat } from '@/lib/types';
import { useState } from 'react';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { ExternalLink } from 'lucide-react';

const assessmentFormSchema = z.object({
  quiz_title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  quiz_description: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  num_questions: z.coerce.number().int().min(1).max(25),
  points_per_question: z.coerce.number().int().min(1),
  shuffle_options: z.boolean(),
  grounded: z.boolean(),
});

type AssessmentFormValues = z.infer<typeof assessmentFormSchema>;

interface GenerateAssessmentFormProps {
  chat: Chat;
}

export default function GenerateAssessmentForm({ chat }: GenerateAssessmentFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentFormSchema),
    defaultValues: {
      quiz_title: `Quiz for ${chat.subject_name}`,
      difficulty: 'medium',
      num_questions: 10,
      points_per_question: 1,
      shuffle_options: true,
      grounded: true,
    },
  });

  const onSubmit = async (values: AssessmentFormValues) => {
    if (!user || !chat.gcr_course_id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User or GCR Course ID is missing.',
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      const payload = {
        ...values,
        user_id: user.uid,
        subject_id: chat.id,
        course_id: chat.gcr_course_id,
        user_subject_json: chat,
        state: "PUBLISHED"
      };

      const result = await generateGcrAssessment(payload);
      
      toast({
        title: 'Assessment Generated Successfully!',
        description: `${result.classroom_coursework.title} has been posted to Google Classroom.`,
      });
      
      form.reset();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Assessment Generation Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!chat.gcr_course_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
        <p className="text-muted-foreground mb-4">
          Please link a Google Classroom course to this subject before generating an assessment.
        </p>
        <Button variant="outline">Go to Settings to Link</Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate New Assessment</CardTitle>
        <CardDescription>
          This will create a new quiz as a Google Form and post it as coursework in your linked Google Classroom.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="quiz_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Unit 1 Review" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quiz_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A short description for the quiz." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="num_questions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Questions</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                  control={form.control}
                  name="points_per_question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points Per Question</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid gap-2">
                    <FormField
                    control={form.control}
                    name="shuffle_options"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <FormLabel>Shuffle Options</FormLabel>
                                <FormDescription>Randomize the order of answers.</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                    />
                </div>
            </div>
             <FormField
                control={form.control}
                name="grounded"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <FormLabel>Grounded Generation</FormLabel>
                            <FormDescription>
                                Use subject resources to generate questions.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                )}
                />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate and Post to Classroom'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
