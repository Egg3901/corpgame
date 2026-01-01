"use client";

import { use } from 'react';
import ProfileDashboard from '@/components/ProfileDashboard';

interface ProfileIdPageProps {
  params: Promise<{ id: string }>;
}

export default function ProfileIdPage({ params }: ProfileIdPageProps) {
  const { id } = use(params);
  return <ProfileDashboard profileId={id} />;
}
