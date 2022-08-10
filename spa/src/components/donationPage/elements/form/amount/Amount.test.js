// import { fireEvent, render, screen } from '@testing-library/react';
// import * as Yup from 'yup';

// no user enabled value

// import { Template } from './Amount.stories';

// test('displays preset options', () => {

// });

// test('displays custom input', () => {

// });

// test('can display default value', () => {

// });

// test (it can reset)

// const defaultProps = {
//   defaultValue: 20,
//   labelText: '',
//   presetAmounts: [],
//   allowUserSetValue: true,
//   defaultUserSetValue: null,
//   helperText: "Select how much you'd like to contribute"
// };

// const schema = Yup.object().shape(validator).required();

// const Form = ({ ...props }) => {
//   const {
//     handleSubmit,
//     control,
//     setValue,
//     formState: { errors }
//   } = useForm({ resolver: yupResolver(schema) });
//   return (
//     <>
//       <form onSubmit={handleSubmit((data) => console.log(data))}>
//         <Amount {...props} errors={errors} control={control} setValue={setValue} />
//         <input type="submit" value="Submit" />
//       </form>
//       <DevTool control={control} />
//     </>
//   );
// };

// test.only('isRequired', async () => {
//   await render(<Form {...defaultProps} />);
//   fireEvent.click(screen.getByText('Submit'));
//   expect(screen.getByText('foo')).toBeInTheDocument();
// });

// test('validates min', () => {
// 	const resolver = getYupValidator({ ...validator });
//   const { handleSubmit } = useForm({ resolver });

//   render(
//     <form onSubmit={handleSubmit((data) => console.log(data))}>
//       <Amount />
//       <input type="submit" />
//     </form>
//   );
// });

// test('validates max', () => {
// 	const resolver = getYupValidator({ ...validator });
//   const { handleSubmit } = useForm({ resolver });

//   render(
//     <form onSubmit={handleSubmit((data) => console.log(data))}>
//       <Amount />
//       <input type="submit" />
//     </form>
//   );
// });
