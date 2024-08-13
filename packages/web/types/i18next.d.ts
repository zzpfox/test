import 'i18next';
import common from '../i18n/zh/common.json';
import dataset from '../i18n/zh/dataset.json';
import app from '../i18n/zh/app.json';
import file from '../i18n/zh/file.json';
import publish from '../i18n/zh/publish.json';
import workflow from '../i18n/zh/workflow.json';
import user from '../i18n/zh/user.json';
import chat from '../i18n/zh/chat.json';
export interface I18nNamespaces {
  common: typeof common;
  dataset: typeof dataset;
  app: typeof app;
  file: typeof file;
  publish: typeof publish;
  workflow: typeof workflow;
  user: typeof user;
  chat: typeof chat;
}

export type I18nNsType = (keyof I18nNamespaces)[];

export type I18nCommonKey = NestedKeyOf<I18nNamespaces['common']>;
export type I18nDataSetKey = NestedKeyOf<I18nNamespaces['dataset']>;
export type I18nAppKey = NestedKeyOf<I18nNamespaces['app']>;
export type I18nPublishKey = NestedKeyOf<I18nNamespaces['publish']>;
export type I18nWorkflowKey = NestedKeyOf<I18nNamespaces['workflow']>;
export type I18nUserKey = NestedKeyOf<I18nNamespaces['user']>;
export type I18nChatKey = NestedKeyOf<I18nNamespaces['chat']>;

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type ParseKeys<Ns extends keyof I18nNamespaces = keyof I18nNamespaces> = {
  [K in Ns]: `${K}:${NestedKeyOf<I18nNamespaces[K]>}`;
}[Ns];

export type I18nKeyFunction = {
  <Key extends ParseKeys>(key: Key): Key;
};

declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
    defaultNS: ['common', 'dataset', 'app', 'file', 'publish', 'workflow', 'user', 'chat'];
    resources: I18nNamespaces;
  }
}
