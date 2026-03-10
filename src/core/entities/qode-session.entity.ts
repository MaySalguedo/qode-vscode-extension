import { Timestamp } from '@angular/fire/firestore';

export interface QodeSession {

	id: string,
	status: 'WAITING' | 'GIST_RECEIVED' | 'ANALYZING' | 'DONE',
	gistIds: string[],
	projectContext?: string,
	createdAt: Timestamp,
	updatedAt: Timestamp

}