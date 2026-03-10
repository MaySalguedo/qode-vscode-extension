export interface GistFile {

	filename: string,
	type: string,
	language: string | null,
	raw_url: string,
	size: number,
	content?: string

}