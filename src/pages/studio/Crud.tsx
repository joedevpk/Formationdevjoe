import CrudPage from '@/pages/studio/CrudPage';
import { articlesConfig, coursesConfig, lessonsConfig, modulesConfig, projectsConfig, resourcesConfig, servicesConfig, testimonialsConfig, workshopsConfig } from '@/pages/studio/configs';

export const CoursesAdmin = () => <CrudPage config={coursesConfig} />;
export const ModulesAdmin = () => <CrudPage config={modulesConfig} />;
export const LessonsAdmin = () => <CrudPage config={lessonsConfig} />;
export const ProjectsAdmin = () => <CrudPage config={projectsConfig} />;
export const ResourcesAdmin = () => <CrudPage config={resourcesConfig} />;
export const ArticlesAdmin = () => <CrudPage config={articlesConfig} />;
export const WorkshopsAdmin = () => <CrudPage config={workshopsConfig} />;
export const ServicesAdmin = () => <CrudPage config={servicesConfig} />;
export const TestimonialsAdmin = () => <CrudPage config={testimonialsConfig} />;
