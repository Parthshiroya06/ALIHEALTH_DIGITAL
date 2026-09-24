import React from 'react';
import {View, StyleSheet} from 'react-native';

import {responsiveHeight, responsiveWidth, Colors, textStyle} from '@resources';
import {TextInput, TextInputProps} from 'react-native-paper';
import {useTheme} from '@react-navigation/native';
interface Props extends TextInputProps {
  textView?: any;
  returnType?: any;
  textinputStyle?: any;
  refs?: any;
}

const InputBox = (props: Props) => {
  const colors = useTheme().colors;
  const {returnType = false, textinputStyle, refs} = props;
  return (
    <View>
      {/* {showTitle && (
        <Text
          style={[textStyle(16, 'black'), {marginTop: responsiveHeight(1.5)}]}>
          {localize(title)}
        </Text>
      )} */}

      {/* <View style={styles.inputContainer}> */}
      <TextInput
        mode="outlined"
        ref={refs}
        style={{
          backgroundColor: colors.background,
          ...styles.inputText,
          ...textinputStyle,
        }}
        selectionColor={colors.blue}
        blurOnSubmit={false}
        returnKeyType={returnType ? 'done' : 'next'}
        // right={
        //   <TextInput.Icon name={() => <Icon name={'camera'} size={20} />} />
        // }

        {...props}
      />
      {/* </View> */}
    </View>
  );
};

export {InputBox};

const styles = StyleSheet.create({
  container: {
    width: responsiveWidth(100),
  },
  inputContainer: {
    height: responsiveHeight(6.5),
    paddingHorizontal: responsiveWidth(1.5),
    borderRadius: responsiveHeight(0.7),

    borderWidth: 1,
    width: responsiveWidth(90),
    borderColor: Colors.lightGrey,
    backgroundColor: Colors.green,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconStyle: {
    resizeMode: 'contain',
  },
  inputText: {
    ...textStyle(15),
    width: responsiveWidth(90),
    height: responsiveHeight(5.5),
    paddingHorizontal: responsiveWidth(1.5),
    borderRadius: responsiveHeight(0.7),
    //marginTop: 5,
  },
});
