import { Timestamp } from "firebase/firestore";

export interface FirestoreEntity {

	id: string,
	createdAt: Timestamp,
	updatedAt: Timestamp

}