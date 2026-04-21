import { injectable } from "inversify";
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class SessionService {
    private readonly STORAGE_KEY = 'qode_session_id';

    public async getOrCreateSessionId(context: vscode.ExtensionContext): Promise<string> {

        let sessionId = context.workspaceState.get<string>(this.STORAGE_KEY);

        if (!sessionId) {

            sessionId = uuidv4();
            await context.workspaceState.update(this.STORAGE_KEY, sessionId);

        }

        return sessionId;

    }

    public async clearSession(context: vscode.ExtensionContext): Promise<void> {

        await context.workspaceState.update(this.STORAGE_KEY, undefined);

    }

}