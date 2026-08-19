export const getProjectChannel = (projectId: string) => {
	return `private-project-${projectId}`;
};

export const getProjectPresenceChannel = (projectId: string) => {
	return `presence-project-${projectId}`;
};

export const getUserPrivateChannel = (userId: string) => {
	return `private-user-${userId}`;
};
