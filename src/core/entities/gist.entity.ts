import { GitEntity } from '@models/git-entity.model';
import { GistOwner } from '@models/gist-owner.model';
import { GistFile } from '@models/gist-file.model';

export interface Gist extends GitEntity<string>{

	git_pull_url: string,
	git_push_url: string,
	description: string | null,
	public: boolean,
	comments: number,
	comments_enabled: boolean,
	owner: GistOwner,
	files: { [key: string]: GistFile },
	truncated: boolean,

}