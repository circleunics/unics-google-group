import FormsOnSubmit = GoogleAppsScript.Events.FormsOnSubmit;
import { SheetService } from '../sheet.service';
import { SpreadSheetService } from '../spreadSheet.service';
import { formatError } from '../util';
import { Email } from '../email';
import { Member } from '../member';
import { Group } from '../group';
import { logVar } from '../logger';
import { IdsService } from '../ids.service';
import Contact = GoogleAppsScript.Contacts.Contact;

export const onChangeEmailFormSubmit = (e: FormsOnSubmit): void => {
  let bodyArray: string[] = ['────　スクリプトログ　─────'];
  let isErr: boolean = false;
  let errBodyArray = [];

  let ss: SpreadSheetService = new SpreadSheetService();
  let o = new ChangeEmail(e, ss);

  const idsOnForm: string[] = [this.id, this.id2, this.id3];
  let ids = new IdsService(idsOnForm, this.sheet);

  let memberKeys_groupKeys: { [key: string]: string[] } = {};
  try {
    const newMemberKey: string = o.newEmail;
    let newMember = new Member(newMemberKey);

    o.oldMemberKeys.push(...ids.getAllMemberKeys());

    if (o.oldMemberKeys.length === 0) {
      const idsString: string = ids.ids.join(', ');
      bodyArray.push(
        `エラー：学籍番号 (${idsString}) は${
          ids.ids.length >= 2 ? 'いずれも' : ''
        }登録されていません。学籍番号が間違っていないか確認してもう一度やり直してください。`
      );
      const errMsg = `エラー：学籍番号 (${idsString}) は${
        ids.ids.length >= 2 ? 'いずれも' : ''
      }登録されていません。学籍番号が間違っていないか確認してもう一度やり直してください。

${logVar({ id: this.id, id2: this.id2, id3: this.id3 })}`;
      throw new Error(errMsg);
    }

    for (let oldMemberKey of o.oldMemberKeys) {
      let oldMember = new Member(oldMemberKey);
      const groupKeys: string[] = oldMember.getGroupKeysBelongingTo();
      memberKeys_groupKeys[oldMemberKey] = groupKeys;

      for (let groupKey of groupKeys) {
        let group = new Group();
        group.initUsingEmail(groupKey);
        let nowRole = oldMember.getRoleIn(group);
        oldMember.deleteFrom(group);
        newMember.addTo(group, nowRole);
        // - Google Group [2019 水戸] (unics_20xx_mito@googlegroups.com):
        //
        //   old@example.com -> new@example.com
        //
        //   正常に変更しました。
        bodyArray.push(`- Google Group [${group.name}] (${group.groupKey}):

  ${oldMemberKey} -> ${newMemberKey}

  正常に変更しました。`);
      }
    }
    bodyArray.push('上記のメーリングリスト（Google Group）のメールアドレスを変更しました。');
  } catch (e) {
    isErr = true;
    bodyArray.push(
      'エラー：メーリングリスト（Google Group）のメールアドレスの変更に失敗しました。'
    );
    errBodyArray.push(`エラー：メーリングリスト（Google Group）のメールアドレスの変更に失敗しました。
${formatError(e)}`);
  }

  try {
    o.changeOnSS(ids);
    bodyArray.push('スプレッドシート上のメールアドレスを変更しました。');
  } catch (e) {
    isErr = true;
    bodyArray.push('エラー：スプレッドシート上のメールアドレスの変更に失敗しました。');
    errBodyArray.push(`エラー：スプレッドシート上のメールアドレスの変更に失敗しました。
${formatError(e)}`);
  }

  try {
    o.changeOnContacts(memberKeys_groupKeys);
    bodyArray.push('Google Contacts のメールアドレスを変更しました。');
  } catch (e) {
    isErr = true;
    bodyArray.push('エラー：Google Contacts のメールアドレスの変更に失敗しました。');
    errBodyArray.push(`エラー：Google Contacts のメールアドレスの変更に失敗しました。
${formatError(e)}`);
  }

  o.sendEmail(bodyArray, isErr, errBodyArray);
};

export class ChangeEmail {
  public newEmail: string;
  private name: string;
  private phonetic: string;
  public id: string;
  public id2: string;
  public id3: string;
  private formType: string;

  private sheet: SheetService;
  private test: boolean;
  public oldMemberKeys: string[];

  constructor(e: FormsOnSubmit, ss: SpreadSheetService, test: boolean = false) {
    this.sheet = ss.getSheet('registration');
    this.test = test;
    this.oldMemberKeys = [];

    if (!this.test) {
      this.newEmail = e.namedValues['新しいメールアドレス'][0];
      this.name = e.namedValues['氏名'][0];
      this.phonetic = e.namedValues['氏名のふりがな'][0];
      this.id = e.namedValues['学籍番号'][0];
      this.id2 = e.namedValues['前の学籍番号'][0];
      this.id3 = e.namedValues['前々の学籍番号'][0];
      this.formType = e.namedValues['確認'][0];
    }
  }

  changeOnContacts(oldMemberKeys_groupKeys: { [key: string]: string[] }): void {
    Object.keys(oldMemberKeys_groupKeys).forEach((oldMemberkey: string) => {
      let groupKeys: string[] = oldMemberKeys_groupKeys[oldMemberkey];
      groupKeys.forEach((groupKey: string) => {
        let group = new Group();
        group.initUsingEmail(groupKey);
        let contactGroup = ContactsApp.getContactGroup(group.name);
        let oldContacts = contactGroup.getContacts();
        oldContacts.forEach((oldContact: Contact) => {
          oldContact.removeFromGroup(contactGroup);
          let newContact = ContactsApp.createContact('', this.name, this.newEmail);
          newContact.addToGroup(contactGroup);
        });
      });
    });
  }

  changeOnSS(ids: IdsService): void {
    const values: string[][] = [[this.newEmail]];
    ids.rowsMatchedIds.forEach((row: number) => {
      ids.sheet.getRange(row, ids.memberKeyColumnIndex, 1, 1).setValues(values);
    });
  }

  sendEmail(bodyArray: string[], isErr: boolean, errBodyArray: string[]): void {
    const tos = [this.newEmail, ...this.oldMemberKeys];
    tos.forEach((to: string) => {
      if (isErr) {
        const sub = '【UNICS】【自動送信】メールアドレスの変更（失敗）';

        //　下のメッセージは bodyArray の先頭に追加
        bodyArray.unshift(`${this.name} さん
  
  メールアドレスの変更処理が何らかのエラー発生により正常に処理されませんでした。`);

        const email = new Email(to, sub, bodyArray, isErr, errBodyArray);
        email.send();
      } else {
        const sub = '【UNICS】【自動送信】メールアドレスの変更処理完了';

        //　下のメッセージは bodyArray の先頭に追加
        bodyArray.unshift(`${this.name} さん
  
  メールアドレスを変更しました。`);

        const email = new Email(to, sub, bodyArray);
        email.send();
      }
    });
  }
}
