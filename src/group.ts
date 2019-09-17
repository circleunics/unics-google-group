import { getNowSchoolYear } from './util';
import { logVar, logVars } from './logger';
import { UrlFetchService } from './urlFetch.service';

export class Group {
  public groupKey: string;
  public created: boolean;

  constructor() {}

  initUsingEmail(email: string, created: boolean = true) {
    if (this.groupKey) {
      const groupKey = this.groupKey;
      const errMsg = `この Group object は既に初期化されています。
最初の初期化時 ${logVar({ groupKey })}
2度目の初期化時 ${logVar({ email })}`;
      throw new Error(errMsg);
    }

    this.groupKey = email;
    this.created = created;
  }

  initUsingCampus(campus: '水戸' | '日立', created: boolean = true) {
    if (this.groupKey) {
      const groupKey = this.groupKey;
      const errMsg = `この Group object は既に初期化されています。
最初の初期化時 ${logVar({ groupKey })}
2度目の初期化時 ${logVar({ campus })}`;
      throw new Error(errMsg);
    }

    switch (campus) {
      case '水戸':
        this.groupKey = `unics_${getNowSchoolYear()}_mito@googlegroups.com`;
        break;

      case '日立':
        this.groupKey = `unics_${getNowSchoolYear()}_hitachi@googlegroups.com`;
        break;

      default:
        const errMsg = `グループの初期化に失敗しました。所属キャンパスの値が不正です。

${logVar({ campus })}`;
        throw new Error(errMsg);
    }

    this.created = created;
  }

  create(name: string, otherVars4Log: object): void {
    if (this.created === true) {
      const logOtherVars: string = logVars(otherVars4Log);
      const msg = `グループ ${this.groupKey} は既に作成されています。既に作成されているグループを新規作成することはできません。

${logOtherVars}`;
      throw new Error(msg);
    }

    //  POST group information to https://www.googleapis.com/admin/directory/v1/groups
    var url = 'https://www.googleapis.com/admin/directory/v1/groups';
    var data = {
      email: this.groupKey,
      name: name,
      description: `UNICS ${name}`
    };
    var params = {
      method: 'post',
      contentType: 'application/json',
      // Convert the JavaScript object to a JSON string.
      payload: JSON.stringify(data)
    };

    const groupKey = this.groupKey;
    let fetch = new UrlFetchService(
      url,
      params,
      201,
      `新しいメーリングリスト ${name} の作成に失敗しました。`,
      {
        groupKey
      }
    );
    fetch.run();

    this.created = true;
  }

  confirmCreated(otherVars4Log: object): void {
    if (this.created === false) {
      const logOtherVars: string = logVars(otherVars4Log);
      const msg = `グループ ${this.groupKey} はまだ作成されていません。作成されていないグループのメンバー操作はできません。

${logOtherVars}`;
      throw new Error(msg);
    }
  }
}