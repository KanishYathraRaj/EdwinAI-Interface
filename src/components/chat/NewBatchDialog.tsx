import { useState, useEffect } from 'react';
import { useGcr } from '@/contexts/gcr-context';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Calendar, BookOpen, Loader2 } from 'lucide-react';

interface NewBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onBatchCreate: (details: {
        batchName: string;
        startDate: string;
        endDate: string;
        gcr_course_id?: string;
    }) => void;
    defaultBatchName?: string;
}

export function NewBatchDialog({ open, onOpenChange, onBatchCreate, defaultBatchName }: NewBatchDialogProps) {
    const { courses, fetchCourses, isLoadingCourses } = useGcr();
    const [name, setName] = useState(defaultBatchName || '');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (open) {
            fetchCourses();
            if (defaultBatchName) setName(defaultBatchName);
        }
    }, [open, fetchCourses, defaultBatchName]);

    const handleCreate = () => {
        onBatchCreate({
            batchName: name || defaultBatchName || 'New Batch',
            startDate,
            endDate,
            gcr_course_id: selectedCourseId
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-0 shadow-2xl bg-card">
                <div className="bg-primary/5 p-6 pb-4 border-b border-primary/10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            <GraduationCap className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight">Create New Batch</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm">
                        Instantiate a new class section for this subject.
                    </DialogDescription>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="batch-name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Batch Name</Label>
                        <div className="relative group">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input
                                id="batch-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={defaultBatchName}
                                className="h-11 pl-10 bg-muted/30 border-border/50 focus:border-primary/30 transition-all rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start-date" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Start Date</Label>
                            <div className="relative group">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-11 pl-10 bg-muted/30 border-border/50 text-xs rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end-date" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">End Date</Label>
                            <div className="relative group">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-11 pl-10 bg-muted/30 border-border/50 text-xs rounded-xl"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="gcr-course" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Google Classroom Link</Label>
                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                            <SelectTrigger className="h-11 bg-muted/30 border-border/50 rounded-xl">
                                <SelectValue placeholder={isLoadingCourses ? "Loading courses..." : "Select Classroom Course (Optional)"} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[250px] rounded-xl">
                                {isLoadingCourses ? (
                                    <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Fetching Classroom Courses...
                                    </div>
                                ) : courses.length > 0 ? (
                                    courses.map(course => (
                                        <SelectItem key={course.id} value={course.id} className="cursor-pointer py-3 rounded-lg">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-sm">{course.name}</span>
                                                {course.section && <span className="text-[10px] opacity-70 italic">{course.section}</span>}
                                            </div>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        No courses found in your Classroom.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground ml-1 italic">
                            Connecting a course syncs students and assignments automatically.
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 bg-muted/5 flex flex-row gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">Cancel</Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!name}
                        className="flex-1 bg-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-xl font-bold"
                    >
                        Create Batch
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
