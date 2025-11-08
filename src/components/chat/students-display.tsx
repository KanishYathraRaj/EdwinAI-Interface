'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { GcrStudent } from '@/lib/types';
import { getGcrStudents } from '@/lib/gcr';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User } from 'lucide-react';

interface StudentsDisplayProps {
  gcrCourseId?: string;
  onAuth: () => void;
}

export default function StudentsDisplay({ gcrCourseId, onAuth }: StudentsDisplayProps) {
  const [students, setStudents] = useState<GcrStudent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStudents = async () => {
      if (!gcrCourseId) return;

      setIsLoading(true);
      try {
        const studentData = await getGcrStudents(gcrCourseId);
        setStudents(studentData);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Failed to Fetch Students",
          description: error.message || "Could not fetch students for this course.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [gcrCourseId, toast]);

  if (!gcrCourseId) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
        <p className="text-muted-foreground mb-4">
          Please connect to Google Classroom and link a course to view students.
        </p>
        <Button onClick={onAuth}>Connect to Classroom</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="ml-4 text-foreground">Loading students...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((student) => (
                <TableRow key={student.userId}>
                  <TableCell className="font-medium flex items-center gap-3">
                     <Avatar className="size-8">
                        <AvatarImage src={student.profile.photoUrl} />
                        <AvatarFallback>
                            <User size={18} />
                        </AvatarFallback>
                    </Avatar>
                    {student.profile.name.fullName}
                  </TableCell>
                  <TableCell>{student.profile.emailAddress}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No students found in this course.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
