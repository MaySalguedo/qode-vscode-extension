import { injectable } from "inversify";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, Firestore } from "firebase/firestore";
import { QodeSession } from "@entities/qode-session.entity";
import { Timestamp } from "firebase/firestore";

@injectable()
export class FirebaseService {
	private db?: Firestore;

	public async initialization(): Promise<void> {
		const firebaseConfig = {

			apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID

		};

		const app = initializeApp(firebaseConfig);
		this.db = getFirestore(app);

	}

	public async createNewSession(sessionId: string): Promise<void> {
		if (!this.db) throw new Error("Firebase no inicializado");
		await setDoc(doc(this.db, "sessions", sessionId), {
			id: sessionId,
			status: 'WAITING',
			gistIds: [],
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now()
		});
	}

	public subscribeToSession(sessionId: string, onUpdate: (data: QodeSession) => void): void {
		if (!this.db) return;
		onSnapshot(doc(this.db, "sessions", sessionId), (snapshot) => {
			if (snapshot.exists()) onUpdate(snapshot.data() as QodeSession);
		});
	}

	public async updateSessionData(sessionId: string, data: Partial<QodeSession>): Promise<void> {
		if (!this.db) return;
		await updateDoc(doc(this.db, "sessions", sessionId), data);
	}
}