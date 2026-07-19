import { redirect } from '@/i18n/navigation';

export default async function CS2SkinRedirect({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/cs2/skins', locale });
}
