import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

interface nameList {
  id: string;
  expense: number;
}
function AppHome() {
  const [expence, setExpence] = useState<never[]>([]);
  const [text, setText] = useState(0);

  const AddExpence = () => {
    setExpence(previous => [...previous, text]);
    setText(0);
  };
  const renderItemlist = ({ item, index }: any) => {
    return (
      <View style={styles.itemList}>
        <Text>{item}</Text>
      </View>
    );
  };

  const button = (btnText: string, onPress: any) => {
    return (
      <Pressable style={styles.btnSty} onPress={onPress}>
        <Text style={styles.textStyle}>{btnText}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.btnList}>
          {button('Filter', () => {})}
          {button('Expance Clear', () => {
            setExpence([]);
          })}
        </View>

        <TextInput
          style={styles.textinpout}
          value={text.toString()}
          keyboardType="numeric"
          placeholder="Enter Expance"
          onChangeText={text => {
            setText(Number(text));
          }}
        />
        <View>
          {button('add', () => {
            AddExpence();
          })}
        </View>
        <View style={{ height: 300 }}>
          <FlatList
            data={expence}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItemlist}
            contentContainerStyle={styles.subContainerSty}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default AppHome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
  },
  textFT: {
    fontSize: 20,
    marginBottom: 12,
  },
  itemList: {
    width: '90%',
    height: 20,
    borderWidth: 1,
  },
  subContainerSty: {
    marginHorizontal: 10,
    padding: 5,
  },
  btnSty: {
    padding: 5,
    borderWidth: 1,
    backgroundColor: '#55bded',
  },
  btnList: {
    justifyContent: 'center',
    flexDirection: 'row',
    alignContent: 'space-between',
    gap: 5,
  },
  textStyle: {
    fontSize: 15,
    color: 'white',
  },
  textinpout: {
    width: '90%',
    height: 40,
    textAlign: 'left',
    borderWidth: 1,
    borderColor: 'black',
  },
});
