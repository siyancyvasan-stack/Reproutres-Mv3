import React from 'react';
import { ModuleListScreen } from '../shared/ModuleListScreen';

export const ProjectListScreen = ({ navigation }: any) => <ModuleListScreen title="Projects" subtitle="Projects, milestones and delivery health" endpoint="/api/v1/projects" onItemPress={item => navigation.navigate('ProjectDetail', { item })} />;
export const ProjectDetailScreen = ({ route }: any) => <ModuleListScreen title={route.params?.item?.name ?? 'Project detail'} subtitle="Milestones, tasks, team and progress" />;
export const TaskListScreen = () => <ModuleListScreen title="Tasks" endpoint="/api/v1/projects/tasks" />;
export const AssignTaskScreen = () => <ModuleListScreen title="Assign task" subtitle="Choose an assignee, priority and due date" />;
export const ProgressTrackingScreen = () => <ModuleListScreen title="Progress tracking" endpoint="/api/v1/projects/progress" />;
export const TeamStatusScreen = () => <ModuleListScreen title="Team status" endpoint="/api/v1/projects/team-status" />;
export const ProjectReportsScreen = () => <ModuleListScreen title="Project reports" endpoint="/api/v1/projects/reports" />;
