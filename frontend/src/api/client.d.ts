import { AxiosInstance } from 'axios';

declare module './client' {
  export const api: AxiosInstance;
  
  export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    token?: string;
    body?: any;
  }

  export function request(path: string, options?: RequestOptions): Promise<any>;
  
  export function login(email: string, password: string): Promise<any>;
  
  export function register(email: string, password: string): Promise<any>;
  
  export function getBoards(token: string): Promise<any>;
  
  export function createBoard(token: string, title: string): Promise<any>;
  
  export function getListsByBoard(token: string, boardId: string | number): Promise<any>;
  
  export function createList(token: string, boardId: string | number, title: string): Promise<any>;
  
  export function deleteBoard(token: string, boardId: string | number): Promise<any>;
  
  export function deleteList(token: string, listId: string | number): Promise<any>;
}
