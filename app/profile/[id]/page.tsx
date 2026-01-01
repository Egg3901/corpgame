"use client";

import ProfileDashboard from '@/components/ProfileDashboard';

interface ProfileIdPageProps {
  params: { id: string };
}

export default function ProfileIdPage({ params }: ProfileIdPageProps) {
  return <ProfileDashboard profileId={params.id} />;
}
