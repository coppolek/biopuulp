import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getPageBySlug } from '../lib/db';
import { BioPage } from '../types';
import PublicBioPage from './PublicBioPage';

export default function PublicView() {
  const { slug } = useParams();
  const [page, setPage] = useState<BioPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      if (slug) {
        const data = await getPageBySlug(slug);
        setPage(data);
      }
      setLoading(false);
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
          <title>Pagina Non Trovata | PUULP</title>
        </Helmet>
        <h1 className="text-3xl font-black italic tracking-tighter mb-2">Pagina Non Trovata</h1>
        <p className="text-gray-500 text-sm">La pagina che stai cercando non esiste o è stata rimossa.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${page.profile.name} | PUULP`}</title>
        <meta name="description" content={page.profile.bio} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:title" content={page.profile.name} />
        <meta property="og:description" content={page.profile.bio} />
        <meta property="og:image" content={page.profile.avatarUrl} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={window.location.href} />
        <meta property="twitter:title" content={page.profile.name} />
        <meta property="twitter:description" content={page.profile.bio} />
        <meta property="twitter:image" content={page.profile.avatarUrl} />
      </Helmet>
      <PublicBioPage page={page} />
    </>
  );
}
