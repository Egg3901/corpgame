"use client";

import ProfileDashboard from '@/components/ProfileDashboard';

interface ProfileSlugPageProps {
  params: { slug: string };
}

export default function ProfileSlugPage({ params }: ProfileSlugPageProps) {
  return <ProfileDashboard slug={params.slug} />;
}
