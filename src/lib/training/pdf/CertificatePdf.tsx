import { Circle, Defs, Document, Font, Image, LinearGradient, Page, Path, RadialGradient, Stop, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { Certificate } from '@/types';
import { ART, CERT_COLORS as C, CERT_H, CERT_TEXT as T, CERT_W, CONTENT_W, CONTENT_X, GRADIENTS, certView, courseSize, nameSize } from '../certArt';
import { pdfSafe } from '../certText';

Font.registerHyphenationCallback((w) => [w]);

/** Écriture calligraphique (TeX Gyre Chorus, GUST Font License) chargée côté navigateur ; hors navigateur (tests Node) : Times italique. */
const BROWSER = typeof document !== 'undefined';
const SCRIPT = BROWSER ? 'JDCScript' : 'Times-Italic';
if (BROWSER) Font.register({ family: 'JDCScript', src: `${import.meta.env.BASE_URL}fonts/jdc-script.ttf` });

const K = 841.89 / CERT_W; // px écran → points PDF
const p = (n: number) => n * K;

const s = StyleSheet.create({
  page: { backgroundColor: '#ffffff', fontFamily: 'Times-Roman', color: C.ink },
  art: { position: 'absolute', top: 0, left: 0 },
  col: { position: 'absolute', top: 0, left: p(CONTENT_X), width: p(CONTENT_W), height: p(CERT_H), paddingTop: p(46), paddingBottom: p(30), alignItems: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  mark: { width: p(30), height: p(30), borderRadius: p(6), backgroundColor: C.navyDeep, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: 'Courier-Bold', fontSize: p(10.5), color: '#ffffff' },
  badge: { backgroundColor: C.gold, paddingVertical: p(6), paddingHorizontal: p(18), marginLeft: p(8) },
  badgeText: { fontFamily: 'Helvetica-Bold', fontSize: p(12), letterSpacing: p(3.6), color: '#ffffff' },
  title1: { fontFamily: 'Times-Bold', fontSize: p(66), letterSpacing: p(2.5), color: C.navy, marginTop: p(14), textAlign: 'center' },
  title2: { fontFamily: 'Times-Bold', fontSize: p(29), letterSpacing: p(5), color: C.navy, marginTop: p(-2), textAlign: 'center' },
  lead: { fontFamily: 'Times-Roman', fontSize: p(11.5), letterSpacing: p(1.6), color: C.ink, marginTop: p(20), textAlign: 'center' },
  script: { fontFamily: SCRIPT, color: C.navy, textAlign: 'center' },
  rule: { alignSelf: 'stretch', borderBottomWidth: 0.6, borderBottomColor: C.rule, marginTop: p(4) },
  because: { fontFamily: 'Times-Roman', fontSize: p(11.5), letterSpacing: p(1.4), color: C.ink, marginTop: p(12), textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-end', alignSelf: 'stretch', marginTop: p(14) },
  label: { fontFamily: 'Times-Bold', fontSize: p(10.5), letterSpacing: p(1.4), color: C.ink, marginRight: p(8), marginBottom: p(3) },
  rowLine: { flex: 1, borderBottomWidth: 0.6, borderBottomColor: C.rule, alignItems: 'center' },
  facts: { fontFamily: 'Times-Roman', fontSize: p(11), letterSpacing: p(0.8), color: C.grey, marginTop: p(12), textAlign: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 'auto' },
  qrBox: { width: p(150), alignItems: 'center' },
  qr: { width: p(92), height: p(92) },
  qrCap: { fontFamily: 'Helvetica', fontSize: p(8.5), color: C.grey, marginTop: p(3), textAlign: 'center' },
  number: { fontFamily: 'Courier-Bold', fontSize: p(10), letterSpacing: p(0.6), color: C.navy, marginTop: p(2) },
  sig: { width: p(190), alignItems: 'center' },
  sigName: { fontFamily: SCRIPT, fontSize: p(27), color: C.navy, textAlign: 'center', height: p(40) },
  sigLine: { alignSelf: 'stretch', borderBottomWidth: 0.8, borderBottomColor: C.navyDeep },
  sigLabel: { fontFamily: 'Times-Bold', fontSize: p(10), letterSpacing: p(1.2), color: C.ink, marginTop: p(4), textAlign: 'center' },
  footer: { fontFamily: 'Helvetica', fontSize: p(8), color: C.grey, marginTop: p(12), textAlign: 'center' },
});

function Art() {
  return (
    <Svg style={s.art} width={841.89} height={p(CERT_H)} viewBox={`0 0 ${CERT_W} ${CERT_H}`}>
      <Defs>
        {GRADIENTS.map((g) => g.kind === 'linear'
          ? <LinearGradient key={g.id} id={g.id} x1={String(g.x1)} y1={String(g.y1)} x2={String(g.x2)} y2={String(g.y2)}>{g.stops.map(([o, c]) => <Stop key={o} offset={`${o * 100}%`} stopColor={c} />)}</LinearGradient>
          : <RadialGradient key={g.id} id={g.id} cx="0.5" cy="0.5" r="0.5">{g.stops.map(([o, c]) => <Stop key={o} offset={`${o * 100}%`} stopColor={c} />)}</RadialGradient>)}
      </Defs>
      {ART.map((a, i) => (a.d
        ? <Path key={i} d={a.d} fill={a.fill} stroke={a.stroke} strokeWidth={a.strokeWidth} opacity={a.opacity} strokeLinecap={a.round ? 'round' : undefined} strokeLinejoin={a.round ? 'round' : undefined} />
        : <Circle key={i} cx={a.cx} cy={a.cy} r={a.r} fill={a.fill} stroke={a.stroke} strokeWidth={a.strokeWidth} opacity={a.opacity} />))}
    </Svg>
  );
}

export interface CertificatePdfProps { certificate: Certificate; qr?: string | null; verifyUrl?: string | null; issuerName?: string }

/** Certificat de formation JOE DEV CODES — A4 paysage. Aucune accréditation ni reconnaissance officielle n'est mentionnée. */
export function CertificatePdfDocument({ certificate: c, qr, verifyUrl, issuerName = 'JOE DEV CODES' }: CertificatePdfProps) {
  const v = certView(c);
  const facts = [v.period && `${T.period} : ${v.period}`, v.duration && `${T.duration} : ${v.duration}`].filter(Boolean).join('   ·   ');
  return (
    <Document title={`Certificat ${c.certificate_number}`} author={issuerName} subject="Certificat de formation" creator={issuerName}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Art />
        <View style={s.col}>
          <View style={s.badgeRow}>
            <View style={s.mark}><Text style={s.markText}>JDC</Text></View>
            <View style={s.badge}><Text style={s.badgeText}>{T.brand}</Text></View>
          </View>
          <Text style={s.title1}>{T.title1}</Text>
          <Text style={s.title2}>{T.title2}</Text>
          <Text style={s.lead}>{T.lead}</Text>
          <Text style={[s.script, { fontSize: p(nameSize(v.holder.length)), marginTop: p(8) }]}>{v.holder}</Text>
          <View style={s.rule} />
          <Text style={s.because}>{T.because}</Text>
          <Text style={[s.script, { fontSize: p(courseSize(v.course.length)), marginTop: p(8) }]}>{v.course}</Text>
          <View style={s.rule} />
          {v.trainer ? (
            <View style={s.row}><Text style={s.label}>{T.trainedBy}</Text><View style={s.rowLine}><Text style={[s.script, { fontSize: p(25) }]}>{v.trainer}</Text></View></View>
          ) : null}
          {facts ? <Text style={s.facts}>{facts}</Text> : null}
          <View style={s.row}>
            {v.place ? <><Text style={s.label}>{T.madeAt}</Text><View style={s.rowLine}><Text style={[s.script, { fontSize: p(25) }]}>{v.place}</Text></View><View style={{ width: p(22) }} /></> : null}
            <Text style={s.label}>{T.on}</Text><View style={[s.rowLine, { flex: v.place ? 0 : 1, width: v.place ? p(190) : undefined }]}><Text style={[s.script, { fontSize: p(25) }]}>{v.date}</Text></View>
          </View>
          <View style={s.bottom}>
            <View style={s.qrBox}>
              {qr ? <Image src={qr} style={s.qr} /> : null}
              <Text style={s.qrCap}>{qr ? T.scan : 'Vérification en ligne'}</Text>
              <Text style={s.number}>{v.number}</Text>
            </View>
            <View style={s.sig}>
              <Text style={s.sigName}>{v.trainer || ' '}</Text>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{T.trainerRole}</Text>
            </View>
            <View style={s.sig}>
              <Text style={s.sigName}>{pdfSafe(issuerName)}</Text>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{T.directorRole}</Text>
            </View>
          </View>
          <Text style={s.footer}>Certificat de formation délivré par {pdfSafe(issuerName)}{verifyUrl ? ` · Vérification : ${verifyUrl}` : ''}</Text>
        </View>
      </Page>
    </Document>
  );
}
