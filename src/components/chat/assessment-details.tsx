'use client';

import { useState, useEffect } from 'react';
import type { Assessment, StudentSubmission, GcrStudent, Chat } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { refreshGcrGrades } from '@/lib/gcr';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface AssessmentDetailsProps {
  assessment: Assessment;
  user: User | null;
  chat: Chat;
  students: GcrStudent[];
  onBack: () => void;
}

export default function AssessmentDetails({ assessment, user, chat, students, onBack }: AssessmentDetailsProps) {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefreshGrades = async () => {
    if (!user || !chat) {
        toast({
            variant: 'destructive',
            title: 'Refresh Failed',
            description: 'User or chat data is missing.',
        });
        return;
    }
    setIsRefreshing(true);
    try {
      const result = await refreshGcrGrades(assessment, user.uid, chat.id);
      setSubmissions(result.updated);
      toast({
        title: 'Grades Refreshed',
        description: `${result.updated_count} submissions were updated.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: error.message || 'Could not fetch the latest grades.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStudentName = (userId: string) => {
    return students.find(s => s.userId === userId)?.profile.name.fullName || userId;
  };

  const numQuestions = Object.keys(assessment.answer_key || {}).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assessments
        </Button>
        <div className="flex items-center gap-2">
            <a href={assessment.responder_uri} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Form
              </Button>
            </a>
            <Button onClick={handleRefreshGrades} disabled={isRefreshing}>
                <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Grades'}
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{assessment.title}</CardTitle>
          <CardDescription>{assessment.description || 'No description available.'}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-semibold text-sm mb-2">Details</h4>
            <p className="text-sm text-muted-foreground">Total Questions: {numQuestions}</p>
            <p className="text-sm text-muted-foreground">Max Points: {assessment.max_points || 'N/A'}</p>
          </div>
          <div>
             <h4 className="font-semibold text-sm mb-2">Answer Key</h4>
             <Accordion type="single" collapsible className="w-full">
                {assessment.answer_key && Object.entries(assessment.answer_key).map(([qid, ans], index) => (
                    <AccordionItem value={`item-${index}`} key={qid}>
                        <AccordionTrigger>Question {index + 1}</AccordionTrigger>
                        <AccordionContent>
                           <p><strong>Correct Answer:</strong> {ans.correct}</p>
                           <p><strong>Points:</strong> {ans.points}</p>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
          <CardDescription>Latest scores from Google Classroom.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length > 0 ? submissions.map(sub => (
                <TableRow key={sub.userId}>
                  <TableCell className="font-medium">{getStudentName(sub.userId)}</TableCell>
                  <TableCell className="text-right">{sub.assignedGrade ?? 'Not graded'}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No submissions found. Click "Refresh Grades" to fetch the latest data.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
