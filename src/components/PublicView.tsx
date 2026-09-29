import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getPageBySlug, trackPageView } from '../lib/db';
import { BioPage } from '../types';
import PublicBioPage from './PublicBioPage';

export default function PublicView() {
  const { slug } = useParams();
  const [page, setPage] = useState<BioPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        if (slug) {
          const data = await getPageBySlug(slug);
          setPage(data);
          if (data) {
            trackPageView(data.id);
          }
        }
      } catch (err) {
        console.warn("Error fetching bio page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Caricamento...</div>;
  }

  if (!page) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center p-4">
        <Helmet>
          <title>Pagina Non Trovata | BioLink Pro</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <h1 className="text-3xl font-black italic tracking-tighter mb-2">Pagina Non Trovata</h1>
        <p className="text-gray-500 text-sm">La pagina che stai cercando non esiste o è stata rimossa.</p>
      </div>
    );
  }

  const profileName = page.profile?.name || (page.profile as any)?.displayName || page.slug;

  // Resolve title: prioritize custom SEO title, fallback to profile name or slug
  const title =
    page.seo?.title?.trim() ||
    (profileName ? `${profileName} | BioLink Pro` : `${page.slug} | BioLink Pro`);

  // Resolve description: prioritize custom SEO description, fallback to profile bio
  const description =
    page.seo?.description?.trim() ||
    page.profile?.bio?.trim() ||
    `Scopri tutti i link, i social e i contenuti di ${profileName} su BioLink Pro.`;

  // Resolve image: prioritize custom SEO image, then profile avatarUrl
  const rawImage = page.seo?.imageUrl?.trim() || page.profile?.avatarUrl?.trim() || '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : `https://puulp.it/${page.slug}`;

  // If the image is a base64 data URL (which social platforms reject), use our binary endpoint
  let ogImage = rawImage;
  if (!ogImage || ogImage.startsWith('data:')) {
    ogImage = currentOrigin ? `${currentOrigin}/api/og-image/bio/${page.slug}` : `/api/og-image/bio/${page.slug}`;
  }

  // Schema.org Structured Data (JSON-LD) for rich search engine indexing
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: title,
    description: description,
    url: currentUrl,
    image: ogImage,
    mainEntity: {
      '@type': 'Person',
      name: profileName,
      description: page.profile?.bio || '',
      image: ogImage,
      sameAs: page.socials?.map((s) => s.url) || []
    }
  };

  return (
    <>
      <Helmet>
        {/* Core meta tags */}
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={currentUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="BioLink Pro" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={title} />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={currentUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <PublicBioPage page={page} />
    </>
  );
}
