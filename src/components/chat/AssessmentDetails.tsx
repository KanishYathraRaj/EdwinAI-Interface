'use client';

import { useState, useEffect } from 'react';
import type { Assessment, StudentSubmission, GcrStudent, Chat } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RefreshCw, ArrowLeft, ExternalLink, Share, CheckCircle, Loader2 } from 'lucide-react';
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
  onPublish: (title: string, content: string, onSuccess?: () => void) => void;
  isPublishing?: boolean;
  userId: string; // Added userId
  subjectId: string; // Added subjectId
}

export default function AssessmentDetails({
  assessment,
  user,
  chat,
  students,
  onBack,
  onPublish,
  isPublishing,
  userId,
  subjectId
}: AssessmentDetailsProps) {
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [publishedLocally, setPublishedLocally] = useState<boolean>(assessment?.published_to_gcr || false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('[AssessmentDetails] Mount/Update. Assessment:', assessment.id, 'Existing grades count:', assessment.grades?.count);
    if (assessment.grades?.by_email) {
      const initialSubmissions: StudentSubmission[] = Object.entries(assessment.grades.by_email).map(([email, info]) => ({
        userId: email,
        email: email,
        assignedGrade: info.score,
        submissionId: '',
        status: 'form_only'
      }));
      console.log('[AssessmentDetails] Setting initial submissions:', initialSubmissions.length);
      setSubmissions(initialSubmissions);
    }
    setPublishedLocally(assessment?.published_to_gcr || false);
  }, [assessment]);

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
      console.log('[AssessmentDetails] Refreshing grades for:', assessment.form_id);
      const result = await refreshGcrGrades(assessment, user.uid, chat.id);
      console.log('[AssessmentDetails] Refresh result:', result);
      setSubmissions(result.updated);
      if (result.updated_count === 0 && result.grades.count > 0) {
        toast({
          title: 'Grades Fetched',
          description: `Found ${result.grades.count} responses in the Form, but none could be pushed to Google Classroom.`,
        });
      } else {
        toast({
          title: 'Grades Refreshed',
          description: `${result.updated_count} submissions were updated in Google Classroom.`,
        });
      }
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

  const handlePublish = () => {
    let content = `# Assessment Summary: ${assessment.title}\n\n`;
    content += `**Description:** ${assessment.description || 'No description'}\n`;
    content += `**Total Points:** ${assessment.max_points}\n`;
    content += `**Number of Questions:** ${Object.keys(assessment.answer_key || {}).length}\n\n`;

    if (assessment.answer_key) {
      content += `## Answer Key\n`;
      Object.entries(assessment.answer_key).forEach(([qid, ans], index) => {
        content += `### Question ${index + 1}\n`;
        content += `- **Correct Answer:** ${ans.correct}\n`;
        content += `- **Points:** ${ans.points}\n\n`;
      });
    }

    onPublish(`Answer Key - ${assessment.title}`, content, () => setPublishedLocally(true));
    setPublishConfirmOpen(false); // Close dialog after publishing
  };

  const getStudentName = (submission: StudentSubmission) => {
    const student = students.find(s =>
      s.userId === submission.userId ||
      s.profile.emailAddress === submission.userId ||
      s.profile.emailAddress === (submission as any).email
    );
    return student?.profile.name.fullName || (submission as any).email || submission.userId;
  };

  const numQuestions = Object.keys(assessment.answer_key || {}).length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 hover:bg-white/5">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold truncate max-w-[200px] sm:max-w-[400px]">{assessment.title}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] h-4">{numQuestions} Questions</Badge>
              <Badge variant="outline" className="text-[10px] h-4">{assessment.max_points || 0} Points</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={publishedLocally ? "outline" : "outline"}
            size="sm"
            className={cn(
              "h-8 transition-all",
              publishedLocally && !isPublishing
                ? "bg-green-600/10 text-green-600 hover:bg-green-600/20 border border-green-600/20 dark:text-green-500 font-medium"
                : ""
            )}
            onClick={() => {
              if (publishedLocally) {
                setPublishConfirmOpen(true);
              } else {
                handlePublish();
              }
            }}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 className={cn('mr-2 h-3 w-3 animate-spin')} />
                Publishing...
              </>
            ) : publishedLocally ? (
              <>
                <CheckCircle className={cn('mr-2 h-3 w-3')} />
                Published
              </>
            ) : (
              <>
                <Share className={cn('mr-2 h-3 w-3')} />
                Publish
              </>
            )}
          </Button>
          <a href={assessment.responder_uri} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-8">
              <ExternalLink className="mr-2 h-3 w-3" />
              Form
            </Button>
          </a>
          <Button onClick={handleRefreshGrades} disabled={isRefreshing} size="sm" className="h-8 bg-primary">
            <RefreshCw className={cn('mr-2 h-3 w-3', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Confirm Republish</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">This assessment answer key has already been published. Do you want to push it again?</p>
              <DialogFooter className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button variant="outline" onClick={() => setPublishConfirmOpen(false)}>
                    Cancel
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={() => { handlePublish(); setPublishConfirmOpen(false); }}>
                    Republish
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Summary & Answer Key */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-muted/30 border-border/50 shadow-none overflow-hidden text-card-foreground">
            <CardHeader className="py-4 px-4 bg-muted/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Answer Key</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-y-auto overflow-x-auto scrollbar-thin relative">
                <Table className="min-w-full">
                  <TableHeader className="bg-muted/20 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-border/20">
                      <TableHead className="w-12 h-9 text-[10px] uppercase font-bold text-muted-foreground px-4">#</TableHead>
                      <TableHead className="h-9 text-[10px] uppercase font-bold text-muted-foreground">Correct Answer</TableHead>
                      <TableHead className="w-16 h-9 text-[10px] uppercase font-bold text-muted-foreground text-right px-4">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessment.answer_key && Object.entries(assessment.answer_key).map(([qid, ans], index) => (
                      <TableRow key={qid} className="hover:bg-muted/20 border-border/20 h-10">
                        <TableCell className="font-mono text-xs text-muted-foreground px-4">{index + 1}</TableCell>
                        <TableCell className="text-xs font-medium truncate max-w-[120px]">{ans.correct}</TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground px-4">{ans.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Submissions */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-muted/30 border-border/50 shadow-none overflow-hidden text-card-foreground">
            <CardHeader className="py-4 px-6 bg-muted/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Student Submissions</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground/60">Loaded {submissions.length} results</CardDescription>
              </div>
              {submissions.length > 0 && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Class Average</span>
                    <span className="text-sm font-bold text-primary">
                      {(submissions.reduce((acc, s) => acc + (s.assignedGrade || 0), 0) / submissions.length).toFixed(1)} / {assessment.max_points}
                    </span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-y-auto overflow-x-auto scrollbar-thin relative">
                <Table className="min-w-full">
                  <TableHeader className="bg-muted/20 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-border/20">
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground px-6">Student</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground">Email</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground">Status</TableHead>
                      <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground text-right px-6">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.length > 0 ? submissions.map((sub, idx) => {
                      const status = sub.assignedGrade !== undefined ? 'Graded' : 'Pending';
                      return (
                        <TableRow key={sub.submissionId || sub.userId || idx} className="hover:bg-muted/20 border-border/20 h-12 transition-colors">
                          <TableCell className="font-medium px-6 text-sm">{getStudentName(sub)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{(sub as any).email || sub.userId}</TableCell>
                          <TableCell>
                            <Badge variant={status === 'Graded' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold px-6 text-sm text-primary">
                            {sub.assignedGrade ?? '--'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                      : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-sm italic">
                            No submissions found.
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
