import { FirestoreEntity } from '@models/firestore-entity.model';

export interface QodeSession extends FirestoreEntity {

	status: 'WAITING' | 'GIST_RECEIVED' | 'ANALYZING' | 'DONE' | 'FAILED' | 'REJECTED',
	gistIds: string[], // Gists' ids
	practicesIds: string[],

}