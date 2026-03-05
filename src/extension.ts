import "reflect-metadata";
import * as vscode from 'vscode';
import { bootstrap } from '@src/main';
import { TYPES } from "@IoC/types";
import { FirebaseService } from "@infra/services/firebase.service";
import { QRProvider } from "@infra/providers/qr.provider";

export async function activate(context: vscode.ExtensionContext): Promise<void> {

	const { container } = await bootstrap();

	const qrProvider = container.get<QRProvider>(TYPES.UIProvider);

	let disposable = vscode.commands.registerCommand('qode.connectApp', async () => {

		await qrProvider.showQRPanel(context);

	});

	context.subscriptions.push(disposable);

	// Ejemplo: Crear una sesión al iniciar
	// await firebase.createNewSession("uuid-generado-qr");
}