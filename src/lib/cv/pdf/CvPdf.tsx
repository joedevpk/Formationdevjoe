import { Document, Image, Link, Page, StyleSheet, Text, View, Font } from '@react-pdf/renderer';
import { Children, type ReactNode } from 'react';
import type { CvData, CvTemplate } from '../types';
import { contactItems, educationPeriod, experiencePeriod, fullName, levelLabel, monthYear, safeHref, sectionFlags, skillGroups, summaryParagraphs, prettyUrl } from '../format';

// Pas de césure automatique : un mot n'est jamais coupé au hasard.
Font.registerHyphenationCallback((w) => [w]);

/**
 * Le PDF utilise les polices standard PDF (Helvetica / Times / Courier) : zéro téléchargement de police,
 * fichier léger (quelques dizaines de Ko), rendu identique partout. Elles couvrent le français (WinAnsi) ;
 * `safe()` retire les caractères hors de ce jeu (emoji, etc.) pour ne jamais produire de carrés vides.
 */
const ALLOWED = /[^\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2022\u2026\u20AC\u2122\n]/g;
const safe = (s: string | null | undefined): string => (s ?? '').replace(/\u202f|\u2009/g, ' ').replace(ALLOWED, '');

const FONT: Record<CvTemplate, { reg: string; bold: string; head: string }> = {
  minimal: { reg: 'Helvetica', bold: 'Helvetica-Bold', head: 'Helvetica-Bold' },
  modern: { reg: 'Helvetica', bold: 'Helvetica-Bold', head: 'Helvetica-Bold' },
  executive: { reg: 'Times-Roman', bold: 'Times-Bold', head: 'Times-Bold' },
  developer: { reg: 'Helvetica', bold: 'Helvetica-Bold', head: 'Courier-Bold' },
};

const INK = '#111111';
const GREY = '#555555';
const LIGHT = '#8a8a8a';
const RULE = '#d4d4d4';
const ACCENT = '#3730a3'; // indigo sombre : reste lisible en noir et blanc

function styles(t: CvTemplate) {
  const f = FONT[t];
  return StyleSheet.create({
    page: { paddingTop: 40, paddingBottom: 54, paddingHorizontal: 44, fontFamily: f.reg, fontSize: 9.5, color: INK, lineHeight: 1.42 },
    header: { flexDirection: t === 'executive' ? 'column' : 'row', alignItems: t === 'executive' ? 'center' : 'flex-start', justifyContent: 'space-between', marginBottom: 6, ...(t === 'modern' ? { backgroundColor: '#f5f5f5', padding: 14, borderRadius: 4 } : {}) },
    headLeft: { ...(t === 'executive' ? { alignSelf: 'stretch' as const } : { flex: 1 }), alignItems: t === 'executive' ? 'center' : 'flex-start' },
    name: { fontFamily: t === 'developer' ? 'Courier-Bold' : f.bold, fontSize: t === 'developer' ? 20 : 24, lineHeight: 1.15, letterSpacing: t === 'executive' ? 1 : 0 },
    headline: { lineHeight: 1.3, fontFamily: t === 'developer' ? 'Courier' : f.reg, fontSize: t === 'developer' ? 10 : 11, color: t === 'modern' || t === 'developer' ? ACCENT : GREY, marginTop: 3 },
    contact: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, justifyContent: t === 'executive' ? 'center' : 'flex-start' },
    contactItem: { fontFamily: t === 'developer' ? 'Courier' : f.reg, fontSize: t === 'developer' ? 8.5 : 9, color: GREY, marginRight: 12, marginBottom: 2 },
    link: { color: GREY, textDecoration: 'underline' },
    photo: { width: 64, height: 64, borderRadius: t === 'executive' ? 2 : t === 'developer' ? 6 : 32, objectFit: 'cover', marginLeft: t === 'executive' ? 0 : 14, marginBottom: t === 'executive' ? 8 : 0 },
    execRule: { borderBottomWidth: 1.5, borderBottomColor: INK, marginTop: 8, marginBottom: 2 },
    section: { marginTop: 14 },
    sectionRow: { marginTop: 12, paddingTop: 10, borderTopWidth: 0.6, borderTopColor: RULE, flexDirection: 'row' },
    label: { width: 104, fontFamily: 'Courier-Bold', fontSize: 7.5, color: GREY, textTransform: 'uppercase', letterSpacing: 0.2, paddingRight: 6 },
    headMin: { fontFamily: f.bold, fontSize: 8, letterSpacing: 1.8, textTransform: 'uppercase', color: GREY, borderBottomWidth: 0.6, borderBottomColor: RULE, paddingBottom: 3, marginBottom: 8 },
    headModern: { fontFamily: f.bold, fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', borderLeftWidth: 3, borderLeftColor: ACCENT, paddingLeft: 7, marginBottom: 8 },
    headExec: { fontFamily: f.bold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', borderBottomWidth: 0.9, borderBottomColor: INK, paddingBottom: 2, marginBottom: 8 },
    item: { marginBottom: 8 },
    itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    itemTitle: { fontFamily: f.bold, fontSize: 10.5, flex: 1, paddingRight: 8 },
    meta: { fontSize: 8.5, color: LIGHT },
    sub: { fontSize: 9.5, color: GREY, marginTop: 1 },
    para: { marginTop: 3, color: '#2a2a2a' },
    bulletRow: { flexDirection: 'row', marginTop: 2 },
    bullet: { width: 10, color: LIGHT },
    chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    chip: { fontFamily: t === 'developer' ? 'Courier' : f.reg, fontSize: 8, borderWidth: 0.6, borderColor: '#b5b5b5', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1, marginRight: 4, marginBottom: 3, color: '#333' },
    skillRow: { flexDirection: 'row', marginBottom: 4 },
    skillCat: { width: 88, fontFamily: f.bold, fontSize: 9 },
    skillList: { flex: 1, color: '#2a2a2a' },
    langRow: { flexDirection: 'row', flexWrap: 'wrap' },
    lang: { marginRight: 22, marginBottom: 2 },
    footer: { position: 'absolute', bottom: 24, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: LIGHT, borderTopWidth: 0.5, borderTopColor: RULE, paddingTop: 5 },
    qrBox: { alignItems: 'center', marginLeft: 12 },
    qr: { width: 52, height: 52 },
    qrCap: { fontSize: 6.5, color: LIGHT, marginTop: 1 },
  });
}

export interface CvPdfProps { data: CvData; template?: CvTemplate; photo?: string | null; qr?: string | null }

export function CvPdfDocument({ data, template, photo, qr }: CvPdfProps) {
  const t = template ?? data.profile.template;
  const s = styles(t);
  const p = data.profile;
  const f = sectionFlags(data);
  const name = safe(fullName(data));
  const contact = contactItems(data);
  const updated = data.updated_at ? new Date(data.updated_at) : null;
  const updatedLabel = updated && !Number.isNaN(updated.getTime()) ? updated.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  const Head = ({ title }: { title: string }) => (
    t === 'minimal' ? <Text style={s.headMin}>{safe(title)}</Text>
    : t === 'modern' ? <Text style={s.headModern}>{safe(title)}</Text>
    : <Text style={s.headExec}>{safe(title)}</Text>
  );

  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    t === 'developer' ? (
      <View style={s.sectionRow}>
        <Text style={s.label}>{`// ${safe(title === 'Activité de formateur' ? 'Formateur' : title)}`}</Text>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    ) : (
      // Le titre et le premier élément restent ensemble : jamais de titre orphelin en bas de page.
      <View style={s.section}>
        <View wrap={false}><Head title={title} />{Children.toArray(children).slice(0, 1)}</View>
        {Children.toArray(children).slice(1)}
      </View>
    )
  );

  const Chips = ({ items }: { items: string[] }) => (
    <View style={s.chips}>{items.map((x) => <Text key={x} style={s.chip}>{safe(x)}</Text>)}</View>
  );

  const L = ({ href, children }: { href?: string | null; children: string }) => {
    const h = safeHref(href);
    return h ? <Link src={h} style={s.link}>{safe(children)}</Link> : <Text>{safe(children)}</Text>;
  };

  const Item = ({ title, meta, sub, children }: { title: string; meta?: string; sub?: string; children?: ReactNode }) => (
    <View style={s.item} wrap={false}>
      <View style={s.itemHead}><Text style={s.itemTitle}>{safe(title)}</Text>{meta ? <Text style={s.meta}>{safe(meta)}</Text> : null}</View>
      {sub ? <Text style={s.sub}>{safe(sub)}</Text> : null}
      {children}
    </View>
  );

  return (
    <Document title={`CV — ${name}`} author={name} subject={safe(p.headline)} creator="JOE DEV CODES" producer="JOE DEV CODES" language="fr-FR">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {t === 'executive' && photo ? <Image src={photo} style={s.photo} /> : null}
          <View style={s.headLeft}>
            <Text style={s.name}>{name}</Text>
            <Text style={s.headline}>{safe(p.headline)}</Text>
            {contact.length > 0 && (
              <View style={s.contact}>
                {contact.map((c) => (
                  <Text key={c.label + c.text} style={s.contactItem}>
                    {c.href && safeHref(c.href) ? <Link src={safeHref(c.href) as string} style={s.link}>{safe(c.text)}</Link> : safe(c.text)}
                  </Text>
                ))}
              </View>
            )}
          </View>
          {t !== 'executive' && photo ? <Image src={photo} style={s.photo} /> : null}
          {qr ? <View style={s.qrBox}><Image src={qr} style={s.qr} /><Text style={s.qrCap}>Version en ligne</Text></View> : null}
        </View>
        {t === 'executive' ? <View style={s.execRule} /> : null}

        {f.summary && (
          <Section title="Profil">
            {summaryParagraphs(data).map((x, i) => <Text key={i} style={{ marginBottom: 4, color: '#2a2a2a' }}>{safe(x)}</Text>)}
          </Section>
        )}

        {f.skills && (
          <Section title="Compétences">
            {skillGroups(data).map((g) => (
              <View key={g.category} style={s.skillRow} wrap={false}>
                <Text style={s.skillCat}>{safe(g.category)}</Text>
                <Text style={s.skillList}>{g.items.map((i) => safe(i.level ? `${i.name} (${i.level})` : i.name)).join(', ')}</Text>
              </View>
            ))}
          </Section>
        )}

        {f.experiences && (
          <Section title="Expériences">
            {data.experiences.map((e) => (
              <Item key={e.id} title={e.role} meta={experiencePeriod(e)} sub={[e.organization, e.location].filter(Boolean).join(' · ')}>
                {e.description ? <Text style={s.para}>{safe(e.description)}</Text> : null}
                {e.achievements.map((a, i) => <View key={i} style={s.bulletRow}><Text style={s.bullet}>•</Text><Text style={{ flex: 1 }}>{safe(a)}</Text></View>)}
                {e.technologies.length > 0 ? <Chips items={e.technologies} /> : null}
              </Item>
            ))}
          </Section>
        )}

        {f.projects && (
          <Section title="Projets">
            {data.projects.map((pr) => (
              <Item key={pr.id} title={pr.title} meta={pr.status} sub={pr.role ?? undefined}>
                {pr.summary ? <Text style={s.para}>{safe(pr.summary)}</Text> : null}
                {pr.results ? <Text style={s.para}>{safe(pr.results)}</Text> : null}
                {pr.technologies.length > 0 ? <Chips items={pr.technologies} /> : null}
                {pr.demo_url || pr.github_url ? (
                  <Text style={{ fontSize: 8.5, marginTop: 2 }}>
                    {pr.demo_url ? <L href={pr.demo_url}>{prettyUrl(pr.demo_url)}</L> : null}
                    {pr.demo_url && pr.github_url ? '   ' : ''}
                    {pr.github_url ? <L href={pr.github_url}>{prettyUrl(pr.github_url)}</L> : null}
                  </Text>
                ) : null}
              </Item>
            ))}
          </Section>
        )}

        {f.trainer && (
          <Section title="Activité de formateur">
            {data.trainer_courses.map((c) => <Text key={c.id} style={{ marginBottom: 2 }}>{safe(c.title)}  <Text style={s.meta}>{safe(`· ${c.category} · ${levelLabel(c.level)}`)}</Text></Text>)}
          </Section>
        )}

        {f.services && (
          <Section title="Services">
            {data.services.map((x) => <View key={x.id} style={s.bulletRow}><Text style={s.bullet}>•</Text><Text style={{ flex: 1 }}>{safe(x.title)}</Text></View>)}
          </Section>
        )}

        {f.education && (
          <Section title="Formation">
            {data.education.map((e) => (
              <Item key={e.id} title={e.institution} meta={educationPeriod(e)} sub={[e.degree, e.field, e.location].filter(Boolean).join(' · ')}>
                {e.description ? <Text style={s.para}>{safe(e.description)}</Text> : null}
              </Item>
            ))}
          </Section>
        )}

        {f.certifications && (
          <Section title="Certifications">
            {data.certifications.map((c) => (
              <Item key={c.id} title={c.name} meta={monthYear(c.issued_on)} sub={[c.issuer, c.credential_id && `ID ${c.credential_id}`].filter(Boolean).join(' · ')}>
                {c.description ? <Text style={s.para}>{safe(c.description)}</Text> : null}
                {c.url ? <Text style={{ fontSize: 8.5, marginTop: 2 }}><L href={c.url}>{prettyUrl(c.url)}</L></Text> : null}
              </Item>
            ))}
          </Section>
        )}

        {f.achievements && (
          <Section title="Réalisations">
            {data.achievements.map((a) => (
              <Item key={a.id} title={a.title} meta={a.year ? String(a.year) : undefined} sub={a.event ?? undefined}>
                {a.result ? <Text style={{ marginTop: 2, fontFamily: FONT[t].bold }}>{safe(a.result)}</Text> : null}
                {a.description ? <Text style={s.para}>{safe(a.description)}</Text> : null}
                {a.url ? <Text style={{ fontSize: 8.5, marginTop: 2 }}><L href={a.url}>{prettyUrl(a.url)}</L></Text> : null}
              </Item>
            ))}
          </Section>
        )}

        {f.languages && (
          <Section title="Langues">
            <View style={s.langRow}>
              {data.languages.map((l) => <Text key={l.id} style={s.lang}><Text style={{ fontFamily: FONT[t].bold }}>{safe(l.language)}</Text>{l.level ? safe(` — ${l.level}`) : ''}</Text>)}
            </View>
          </Section>
        )}

        <View style={s.footer} fixed>
          <Text>{name}{updatedLabel ? ` · CV mis à jour le ${updatedLabel}` : ''}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
