declare class Schema {
  constructor(doc: object);
}

export const userSchema = new Schema({
  email: String,
  active: Boolean,
});
