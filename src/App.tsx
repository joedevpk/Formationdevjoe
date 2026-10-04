import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingState } from '@/components/ui/Spinner';
import { ToastProvider } from '@/components/ui/Toast';

const Home = lazy(() => import('@/pages/Home'));
const About = lazy(() => import('@/pages/About'));
const Learn = lazy(() => import('@/pages/Learn'));
const Courses = lazy(() => import('@/pages/Courses'));
const CourseDetail = lazy(() => import('@/pages/CourseDetail'));
const Path = lazy(() => import('@/pages/Path'));
const Projects = lazy(() => import('@/pages/Projects'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const VibeCoding = lazy(() => import('@/pages/VibeCoding'));
const IdeaToProduct = lazy(() => import('@/pages/IdeaToProduct'));
const PitchLab = lazy(() => import('@/pages/PitchLab'));
const Resources = lazy(() => import('@/pages/Resources'));
const Articles = lazy(() => import('@/pages/Articles'));
const ArticleDetail = lazy(() => import('@/pages/ArticleDetail'));
const Workshops = lazy(() => import('@/pages/Workshops'));
const WorkshopDetail = lazy(() => import('@/pages/WorkshopDetail'));
const Services = lazy(() => import('@/pages/Services'));
const Contact = lazy(() => import('@/pages/Contact'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Cv = lazy(() => import('@/pages/Cv'));
const VerifyCertificate = lazy(() => import('@/pages/VerifyCertificate'));
const TrainingList = lazy(() => import('@/pages/TrainingList'));
const CvStudio = lazy(() => import('@/pages/studio/cv/CvStudio'));
const MentionsLegales = lazy(() => import('@/pages/Legal').then((m) => ({ default: m.MentionsLegales })));
const Confidentialite = lazy(() => import('@/pages/Legal').then((m) => ({ default: m.Confidentialite })));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

const AppLayout = lazy(() => import('@/pages/app/AppLayout'));
const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const MyCourses = lazy(() => import('@/pages/app/MyCourses'));
const CoursePlayer = lazy(() => import('@/pages/app/CoursePlayer'));
const Progress = lazy(() => import('@/pages/app/Progress'));
const MyProjects = lazy(() => import('@/pages/app/MyProjects'));
const MyResources = lazy(() => import('@/pages/app/MyResources'));
const Certificates = lazy(() => import('@/pages/app/Certificates'));
const CertificateView = lazy(() => import('@/pages/app/CertificateView'));
const RegistrationDetail = lazy(() => import('@/pages/app/RegistrationDetail'));
const AnnouncementView = lazy(() => import('@/pages/app/AnnouncementView'));
const Favorites = lazy(() => import('@/pages/app/Favorites'));
const Notifications = lazy(() => import('@/pages/app/Notifications'));
const Profile = lazy(() => import('@/pages/app/Profile'));

const StudioLayout = lazy(() => import('@/pages/studio/StudioLayout'));
const Overview = lazy(() => import('@/pages/studio/Overview'));
const Learners = lazy(() => import('@/pages/studio/Learners'));
const Enrollments = lazy(() => import('@/pages/studio/Enrollments'));
const Messages = lazy(() => import('@/pages/studio/Messages'));
const Settings = lazy(() => import('@/pages/studio/Settings'));
const Analytics = lazy(() => import('@/pages/studio/Analytics'));
const CoursesList = lazy(() => import('@/pages/studio/CoursesList'));
const CourseWizard = lazy(() => import('@/pages/studio/CourseWizard'));
const NotificationsAdmin = lazy(() => import('@/pages/studio/NotificationsAdmin'));
const TrainingSessions = lazy(() => import('@/pages/studio/training/TrainingSessions'));
const SessionManager = lazy(() => import('@/pages/studio/training/SessionManager'));
const AnnouncementsAdmin = lazy(() => import('@/pages/studio/training/AnnouncementsAdmin'));
const CertificatesAdmin = lazy(() => import('@/pages/studio/training/CertificatesAdmin'));
const Presences = lazy(() => import('@/pages/studio/training/Presences'));
const CheckIn = lazy(() => import('@/pages/studio/training/CheckIn'));
const Crud = {
  Projects: lazy(() => import('@/pages/studio/Crud').then((m) => ({ default: m.ProjectsAdmin }))),
  Resources: lazy(() => import('@/pages/studio/Crud').then((m) => ({ default: m.ResourcesAdmin }))),
  Articles: lazy(() => import('@/pages/studio/Crud').then((m) => ({ default: m.ArticlesAdmin }))),
  Workshops: lazy(() => import('@/pages/studio/Crud').then((m) => ({ default: m.WorkshopsAdmin }))),
  Services: lazy(() => import('@/pages/studio/Crud').then((m) => ({ default: m.ServicesAdmin }))),
  Testimonials: lazy(() => import('@/pages/studio/Crud').then((m) => ({ default: m.TestimonialsAdmin }))),
};

/** Pages du Studio réservées à l'ADMIN (l'instructeur n'a que le contenu pédagogique). */
function Admin({ children }: { children: ReactNode }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="a-propos" element={<About />} />
            <Route path="apprendre" element={<Learn />} />
            <Route path="formations" element={<Courses />} />
            <Route path="formations/:slug" element={<CourseDetail />} />
            <Route path="formations/:slug/sessions/:sessionId/liste" element={<TrainingList />} />
            <Route path="verify-certificate/:certificateNumber" element={<VerifyCertificate />} />
            <Route path="parcours" element={<Path />} />
            <Route path="projets" element={<Projects />} />
            <Route path="projets/:slug" element={<ProjectDetail />} />
            <Route path="vibe-coding" element={<VibeCoding />} />
            <Route path="idee-au-produit" element={<IdeaToProduct />} />
            <Route path="pitch-lab" element={<PitchLab />} />
            <Route path="ressources" element={<Resources />} />
            <Route path="articles" element={<Articles />} />
            <Route path="articles/:slug" element={<ArticleDetail />} />
            <Route path="workshops" element={<Workshops />} />
            <Route path="workshops/:slug" element={<WorkshopDetail />} />
            <Route path="services" element={<Services />} />
            <Route path="cv" element={<Cv />} />
            <Route path="contact" element={<Contact />} />
            <Route path="mentions-legales" element={<MentionsLegales />} />
            <Route path="confidentialite" element={<Confidentialite />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />

          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="formations" element={<MyCourses />} />
            <Route path="formations/inscriptions/:id" element={<RegistrationDetail />} />
            <Route path="formations/:slug" element={<CoursePlayer />} />
            <Route path="annonces/:id" element={<AnnouncementView />} />
            <Route path="progression" element={<Progress />} />
            <Route path="projets" element={<MyProjects />} />
            <Route path="ressources" element={<MyResources />} />
            <Route path="certificats" element={<Certificates />} />
            <Route path="certificats/:id" element={<CertificateView />} />
            <Route path="favoris" element={<Favorites />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profil" element={<Profile />} />
          </Route>

          <Route path="/studio" element={<ProtectedRoute staffOnly><StudioLayout /></ProtectedRoute>}>
            <Route index element={<Overview />} />
            <Route path="formations" element={<CoursesList />} />
            <Route path="formations/nouvelle" element={<CourseWizard />} />
            <Route path="formations/:id" element={<CourseWizard />} />
            <Route path="articles" element={<Crud.Articles />} />
            <Route path="workshops" element={<Crud.Workshops />} />
            <Route path="ressources" element={<Crud.Resources />} />
            <Route path="presences" element={<Presences />} />
            <Route path="pointage/:token" element={<CheckIn />} />
            <Route path="sessions" element={<Admin><TrainingSessions /></Admin>} />
            <Route path="sessions/:id" element={<Admin><SessionManager /></Admin>} />
            <Route path="annonces" element={<Admin><AnnouncementsAdmin /></Admin>} />
            <Route path="certificats" element={<Admin><CertificatesAdmin /></Admin>} />
            <Route path="services" element={<Admin><Crud.Services /></Admin>} />
            <Route path="temoignages" element={<Admin><Crud.Testimonials /></Admin>} />
            <Route path="apprenants" element={<Admin><Learners /></Admin>} />
            <Route path="inscriptions" element={<Admin><Enrollments /></Admin>} />
            <Route path="projets" element={<Admin><Crud.Projects /></Admin>} />
            <Route path="messages" element={<Admin><Messages /></Admin>} />
            <Route path="notifications" element={<Admin><NotificationsAdmin /></Admin>} />
            <Route path="cv" element={<Admin><CvStudio /></Admin>} />
            <Route path="analytics" element={<Admin><Analytics /></Admin>} />
            <Route path="parametres" element={<Admin><Settings /></Admin>} />
            <Route path="*" element={<Navigate to="/studio" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
