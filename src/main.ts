// src/main.ts
import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";
import { Container } from "inversify";
import { container } from "@IoC/container";
import { TYPES } from "@IoC/types";
import { FirebaseService } from "@infra/services/firebase.service";

export async function bootstrap(): Promise<{ container: Container }> {

	dotenv.config({ path: path.resolve(__dirname, '../.env') });

	const firebase: FirebaseService = container.get<FirebaseService>(TYPES.FirebaseService);

	try {

		await firebase.initialization();

	} catch (error) {
		console.error("Qode Extension: Failed to initialize Firebase", error);
	}

	return { container };
}