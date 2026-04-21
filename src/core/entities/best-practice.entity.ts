import { FirestoreEntity } from '@models/firestore-entity.model';

export interface BestPractice extends FirestoreEntity {

	name: string,
	description: string,
	category: 'design_pattern' | 'philosofy' | 'architecture' | 'ci_cd' | 'property',
	gist?: string, // Gists' ids
	sub_category?: string,
	icon?: string

}