import { Timestamp } from "firebase/firestore";

export interface QodeSession {

	id: string,
	status: 'WAITING' | 'GIST_RECEIVED' | 'ANALYZING' | 'DONE',
	gistContent?: string,
	projectContext?: string,
	createdAt: Timestamp,
	updatedAt: Timestamp

}