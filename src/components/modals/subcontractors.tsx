"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Star, Mail, Users } from 'lucide-react';
import { toast } from 'sonner'; // or your toast lib

const supabase = createClient();

interface Subcontractor {
  id: string;
  name: string;
  email: string;
  skills: string[];
  availability: boolean;
  rating: number;
}

interface Props {
  jobId: number;
  jobDescription: string;
//   startDate: Date;
//   endDate: Date;
}

export function AllocateSubcontractorDialog({ jobId, jobDescription }: Props) {
  const [loading, setLoading] = useState(false);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');

  // Fetch available subcontractors on open
  useEffect(() => {
    fetchSubcontractors();
  }, []);

  const fetchSubcontractors = async () => {
    let query = supabase
      .from('subcontractor')
      .select('*')
      .eq('availability', true);

    if (searchTerm.trim()) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error } = await query.order('rating', { ascending: false });
    if (error) {
      toast.error('Error fetching subcontractors');
    } else {
      setSubcontractors(data as unknown as Subcontractor[] || []);
    }
  };

  const handleAllocate = async () => {
    if (!selectedSubId) return;

    setLoading(true);
    try {
      // Insert job allocation
      const { data: allocation, error: allocError } = await supabase
        .from('job_allocation')
        .insert({
          job_id: jobId, // Link to job
          subcontractor_id: selectedSubId,
          job_description: jobDescription,
          status: 'pending' as const,
        })
        .select()
        .single();

      if (allocError) throw allocError;
      allocError && console.error(allocError);
      console.log(allocation, "Allocation data");
      toast.success(`Job allocated to subcontractor!`);

      // Get subcontractor details
      const { data: subcontractor } = await supabase
        .from('subcontractor')
        .select('*')
        .eq('id', selectedSubId)
        .single();

    //   // Send email notification (client-side; better as edge function)
    //   if (subcontractor) {
    //     // In production, call Supabase edge function for email
    //     await supabase.functions.invoke('send-job-notification', {
    //       body: {
    //         email: subcontractor.email,
    //         name: subcontractor.name,
    //         jobDescription,
    //       },
    //     });
    //   }

      // Update job status to 'assigned'
      await supabase
        .from('job_assignments')
        .update({ status: 'assigned' })
        .eq('id', Number(jobId));

      toast.success('Job allocated successfully!');
      setSelectedSubId('');
      fetchSubcontractors(); // Refresh list
    } catch (error) {
      toast.error('Failed to allocate job');
      console.error(error, "Allocation error");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubs = subcontractors.filter(
    (sub) =>
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.skills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Users className="h-4 w-4 mr-2" />
          Allocate Subcontractor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Allocate Subcontractor</DialogTitle>
          <DialogDescription>
            Select an available subcontractor for this job: <strong>{jobDescription}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Search */}
          <Input
            placeholder="Search by name or skills..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
          />

          {/* Subcontractors list */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredSubs.map((sub) => (
              <Card
                key={sub.id}
                className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedSubId === sub.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedSubId(sub.id)}
              >
                <CardHeader className="p-0 pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      {sub.name}
                      <Badge variant="secondary" className="text-xs">
                        Available
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-500">{sub.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.floor(sub.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">({sub.rating})</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-2">
                  <div className="flex flex-wrap gap-1">
                    {sub.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredSubs.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">No subcontractors found</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Select value={selectedSubId} onValueChange={setSelectedSubId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select subcontractor" />
            </SelectTrigger>
            <SelectContent>
              {subcontractors.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name} ({sub.rating})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleAllocate} disabled={!selectedSubId || loading}>
            {loading ? 'Allocating...' : 'Allocate Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
